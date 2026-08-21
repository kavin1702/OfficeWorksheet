"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Briefcase, 
  Cloud, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  FileText, 
  ArrowUpDown, 
  Database, 
  Moon, 
  Sun as SunIcon, 
  PlusCircle, 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  Timer, 
  CornerDownRight, 
  Search, 
  X, 
  Table as TableIcon, 
  LayoutGrid, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit3, 
  Activity, 
  Check, 
  UploadCloud, 
  Sheet, 
  FileSpreadsheet, 
  FileCode, 
  Printer, 
  MessageSquare,
  Hourglass,
  AlertOctagon,
  Eye,
  Trash2,
  Copy,
  User,
  LogOut,
  ChevronDown,
  Users,
  UserPlus,
  ArrowRight
} from "lucide-react";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { 
  createWorksheetEntry, 
  updateWorksheetEntry, 
  deleteWorksheetEntry, 
  duplicateWorksheetEntry, 
  carryForwardYesterdayPending, 
  bulkImportEntries,
  getWorksheetEntries,
  dbHealthCheck,
  WorksheetEntryDto 
} from "./actions";
import { logoutAction, switchUserAction, addFriendProfileAction } from "./authActions";
import { SAMPLE_WORKSHEET_DATA } from "./sampleData";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface WorksheetAppProps {
  initialEntries: WorksheetEntryDto[];
  isDbConnected: boolean;
  currentUser: { 
    id: string; 
    email: string; 
    name: string | null;
    username: string | null;
    role: string;
    color: string;
    avatar: string | null;
  };
  allUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    username: string | null;
    role: string;
    color: string;
    avatar: string | null;
  }>;
}

export default function WorksheetApp({ initialEntries, isDbConnected: serverDbConnected, currentUser, allUsers }: WorksheetAppProps) {
  // App State
  const [entries, setEntries] = useState<WorksheetEntryDto[]>(initialEntries);
  
  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await logoutAction();
    }
  };

  // Profile Switching & Scope States
  const [userScope, setUserScope] = useState<'me' | 'all'>('me');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [isUserAuthModalOpen, setIsUserAuthModalOpen] = useState<boolean>(false);
  const [activeUserAuthTab, setActiveUserAuthTab] = useState<'switch' | 'new'>('switch');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState<string>("#3b82f6");

  const handleScopeChange = async (scope: 'me' | 'all') => {
    setUserScope(scope);
    setIsSyncing(true);
    try {
      const data = await getWorksheetEntries(scope);
      setEntries(data);
    } catch (error) {
      console.error("Failed to change scope:", error);
      showToast("Error updating worksheet scope", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      showToast("Switching profile...", "info");
      await switchUserAction(userId);
    } catch (error: any) {
      showToast("Failed to switch profile: " + error.message, "error");
    }
  };

  const handleAddFriendProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("color", selectedAvatarColor);

    try {
      showToast("Creating friend profile...", "info");
      const res = await addFriendProfileAction(formData);
      if (res && !res.success) {
        showToast(res.message, "error");
      } else {
        setIsUserAuthModalOpen(false);
        showToast("Profile created successfully!", "success");
      }
    } catch (error: any) {
      showToast("Failed to create profile: " + error.message, "error");
    }
  };
  const [dbConnected, setDbConnected] = useState<boolean>(serverDbConnected);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>("theme-light");
  const [currentView, setCurrentView] = useState<string>("table"); // 'table' | 'cards' | 'calendar' | 'analytics'
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Filters State
  const [dateFilter, setDateFilter] = useState<string>("today"); // 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting State
  const [sortField, setSortField] = useState<"date" | "projectName" | "status" | "hoursWorked">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Modals visibility
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form State
  const [formEntryId, setFormEntryId] = useState<string>("");
  const [formDate, setFormDate] = useState<string>("");
  const [formProject, setFormProject] = useState<string>("");
  const [formWork, setFormWork] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("In Progress");
  const [formHours, setFormHours] = useState<string>("");
  const [formPriority, setFormPriority] = useState<string>("Medium");
  const [formRemarks, setFormRemarks] = useState<string>("");

  // Project Autocomplete & Recent tags
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Import preview data
  const [activeIeTab, setActiveIeTab] = useState<"export" | "import">("export");
  const [parsedImportData, setParsedImportData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report State
  const [reportDate, setReportDate] = useState<string>("");
  const [reportFormat, setReportFormat] = useState<string>("standard");

  // Calendar State
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(7); // August (0-indexed)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>("2026-08-06");
  const [isDayInspectorOpen, setIsDayInspectorOpen] = useState<boolean>(true);

  // Helper date generators
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getThisWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const getThisMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split("T")[0],
      end: lastDay.toISOString().split("T")[0],
    };
  };

  // Toast notifier helper
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load theme and set today
  useEffect(() => {
    const savedTheme = localStorage.getItem("workpulse_theme") || "theme-light";
    setTheme(savedTheme);
    document.body.className = savedTheme;

    // Set default report date
    setReportDate(getTodayStr());

    // Sync calendar view variables
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setCalendarSelectedDate(getTodayStr());
  }, []);

  // Theme Toggle
  const toggleTheme = () => {
    const newTheme = theme === "theme-light" ? "theme-dark" : "theme-light";
    setTheme(newTheme);
    document.body.className = newTheme;
    localStorage.setItem("workpulse_theme", newTheme);
  };

  // Database refetch / sync action
  const syncWithDatabase = async () => {
    setIsSyncing(true);
    showToast("Syncing with online database...", "info");
    try {
      const activeEntries = await getWorksheetEntries(userScope);
      const check = await dbHealthCheck();
      setEntries(activeEntries);
      setDbConnected(check);
      showToast("Cloud sync complete! Up to date.", "success");
    } catch (err: any) {
      showToast("Sync error: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Carry Forward pending yesterday tasks
  const handleCarryForward = async () => {
    try {
      showToast("Carrying forward pending tasks...", "info");
      const res = await carryForwardYesterdayPending();
      if (res.count > 0) {
        showToast(res.message, "success");
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
        // Refresh
        const updated = await getWorksheetEntries(userScope);
        setEntries(updated);
      } else {
        showToast(res.message, "info");
      }
    } catch (err: any) {
      showToast("Carry forward failed: " + err.message, "error");
    }
  };

  // Load sample data
  const handleLoadSampleData = async () => {
    try {
      showToast("Loading sample office worksheet...", "info");
      const success = await bulkImportEntries(SAMPLE_WORKSHEET_DATA);
      if (success) {
        showToast("Sample office data loaded successfully!", "success");
        const updated = await getWorksheetEntries(userScope);
        setEntries(updated);
        confetti({ particleCount: 50, spread: 40 });
      } else {
        showToast("Failed to load sample data", "error");
      }
    } catch (err: any) {
      showToast("Sample data error: " + err.message, "error");
    }
  };

  // Filtering & Sorting Logic
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.projectName?.trim()) set.add(e.projectName.trim());
    });
    return Array.from(set).sort();
  }, [entries]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  const sortedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      // Date filter
      if (dateFilter === "today") {
        if (entry.date !== getTodayStr()) return false;
      } else if (dateFilter === "yesterday") {
        if (entry.date !== getYesterdayStr()) return false;
      } else if (dateFilter === "this-week") {
        const range = getThisWeekRange();
        if (entry.date < range.start || entry.date > range.end) return false;
      } else if (dateFilter === "this-month") {
        const range = getThisMonthRange();
        if (entry.date < range.start || entry.date > range.end) return false;
      } else if (dateFilter === "custom") {
        if (customStartDate && entry.date < customStartDate) return false;
        if (customEndDate && entry.date > customEndDate) return false;
      }

      // Project filter
      if (projectFilter !== "all" && entry.projectName !== projectFilter) return false;

      // Status filter
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProject = entry.projectName?.toLowerCase().includes(q);
        const matchWork = entry.work?.toLowerCase().includes(q);
        const matchRemarks = entry.remarks?.toLowerCase().includes(q);
        const matchStatus = entry.status?.toLowerCase().includes(q);
        if (!matchProject && !matchWork && !matchRemarks && !matchStatus) return false;
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "hoursWorked") {
        valA = a.hoursWorked || 0;
        valB = b.hoursWorked || 0;
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        const cmp = valA.localeCompare(valB);
        return sortDirection === "asc" ? cmp : -cmp;
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [entries, dateFilter, customStartDate, customEndDate, projectFilter, statusFilter, searchQuery, sortField, sortDirection]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const entriesToCompute = sortedEntries;
    const totalTasks = entriesToCompute.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let blockedCount = 0;
    let underReviewCount = 0;
    let leaveCount = 0;
    let totalHours = 0;
    const projectHoursMap: { [key: string]: number } = {};

    entriesToCompute.forEach((e) => {
      if (e.status === "Completed") completedCount++;
      else if (e.status === "In Progress") inProgressCount++;
      else if (e.status === "Pending") pendingCount++;
      else if (e.status === "Blocked") blockedCount++;
      else if (e.status === "Under Review") underReviewCount++;
      else if (e.status === "Leave") leaveCount++;

      const hrs = Number(e.hoursWorked) || 0;
      totalHours += hrs;

      const pName = e.projectName || "General";
      projectHoursMap[pName] = (projectHoursMap[pName] || 0) + hrs;
    });

    const activeTasks = totalTasks - leaveCount;
    const completionRate = activeTasks > 0 ? Math.round((completedCount / activeTasks) * 100) : (completedCount > 0 ? 100 : 0);

    return {
      totalTasks,
      completedCount,
      inProgressCount,
      pendingCount,
      blockedCount,
      underReviewCount,
      leaveCount,
      completionRate,
      totalHours: Number(totalHours.toFixed(1)),
      projectHoursMap,
      statusCounts: {
        "Completed": completedCount,
        "In Progress": inProgressCount,
        "Pending": pendingCount,
        "Blocked": blockedCount,
        "Under Review": underReviewCount,
        "Leave": leaveCount,
      },
    };
  }, [sortedEntries]);

  // Date Pills subtitle context
  const dateFilterContextLabel = useMemo(() => {
    if (dateFilter === "today") return "Today's Status";
    if (dateFilter === "yesterday") return "Yesterday";
    if (dateFilter === "this-week") return "This Week";
    if (dateFilter === "this-month") return "This Month";
    if (dateFilter === "all") return "All Records";
    return "Filtered Range";
  }, [dateFilter]);

  // CRUD Handlers
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await updateWorksheetEntry(id, { status: newStatus });
      if (res) {
        setEntries(prev => prev.map(e => e.id === id ? res : e));
        if (newStatus === "Completed") {
          showToast("Task marked as Completed! Great job! 🎉", "success");
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
        } else {
          showToast(`Status updated to ${newStatus}`, "info");
        }
      }
    } catch (err: any) {
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  const handleDuplicateEntry = async (id: string) => {
    try {
      const res = await duplicateWorksheetEntry(id);
      if (res) {
        setEntries(prev => [res, ...prev]);
        showToast("Task duplicated into today's log!", "success");
        confetti({ particleCount: 30, spread: 30 });
      }
    } catch (err: any) {
      showToast("Failed to duplicate task: " + err.message, "error");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm("Are you sure you want to delete this worksheet entry?")) {
      try {
        const success = await deleteWorksheetEntry(id);
        if (success) {
          setEntries(prev => prev.filter(e => e.id !== id));
          showToast("Work entry deleted.", "info");
        }
      } catch (err: any) {
        showToast("Failed to delete: " + err.message, "error");
      }
    }
  };

  // Open Log Work form modal
  const openWorkModal = (entry?: WorksheetEntryDto) => {
    if (entry) {
      setFormEntryId(entry.id);
      setFormDate(entry.date);
      setFormProject(entry.projectName);
      setFormWork(entry.work);
      setFormStatus(entry.status);
      setFormHours(entry.hoursWorked ? String(entry.hoursWorked) : "");
      setFormPriority(entry.priority);
      setFormRemarks(entry.remarks || "");
    } else {
      setFormEntryId("");
      setFormDate(getTodayStr());
      setFormProject("");
      setFormWork("");
      setFormStatus("In Progress");
      setFormHours("");
      setFormPriority("Medium");
      setFormRemarks("");
    }
    setProjectSuggestions([]);
    setShowSuggestions(false);
    setIsWorkModalOpen(true);
  };

  // Save Log Work form submit
  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formProject.trim() || !formWork.trim()) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const payload = {
      date: formDate,
      projectName: formProject.trim(),
      work: formWork.trim(),
      status: formStatus,
      hoursWorked: parseFloat(formHours) || 0,
      priority: formPriority,
      remarks: formRemarks.trim(),
    };

    try {
      if (formEntryId) {
        // Edit Mode
        const res = await updateWorksheetEntry(formEntryId, payload);
        if (res) {
          setEntries(prev => prev.map(e => e.id === formEntryId ? res : e));
          showToast("Work log updated successfully!", "success");
        }
      } else {
        // Create Mode
        const res = await createWorksheetEntry(payload);
        if (res) {
          setEntries(prev => [res, ...prev]);
          showToast("Work log added successfully!", "success");
          if (formStatus === "Completed") {
            confetti({ particleCount: 80, spread: 50 });
          }
        }
      }
      setIsWorkModalOpen(false);
    } catch (err: any) {
      showToast("Failed to save entry: " + err.message, "error");
    }
  };

  // Auto-complete project names
  const handleProjectInputChange = (val: string) => {
    setFormProject(val);
    if (!val.trim()) {
      setProjectSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = uniqueProjects.filter((p) => 
      p.toLowerCase().includes(val.toLowerCase()) && p.toLowerCase() !== val.toLowerCase()
    );
    setProjectSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // Select project suggestion
  const selectProjectSuggestion = (proj: string) => {
    setFormProject(proj);
    setProjectSuggestions([]);
    setShowSuggestions(false);
  };

  // Helper formatting for tables/cards
  const getStatusMeta = (status: string) => {
    switch (status) {
      case "Completed":
        return { cls: "status-completed", icon: <CheckCircle2 className="icon-sm" />, label: "Completed" };
      case "In Progress":
        return { cls: "status-in-progress", icon: <Clock className="icon-sm" />, label: "In Progress" };
      case "Pending":
        return { cls: "status-pending", icon: <Hourglass className="icon-sm" />, label: "Pending" };
      case "Blocked":
        return { cls: "status-blocked", icon: <AlertOctagon className="icon-sm" />, label: "Blocked" };
      case "Under Review":
        return { cls: "status-under-review", icon: <Eye className="icon-sm" />, label: "Under Review" };
      case "Leave":
        return { cls: "status-leave", icon: <SunIcon className="icon-sm" />, label: "Leave / Off" };
      default:
        return { cls: "status-in-progress", icon: <Clock className="icon-sm" />, label: status || "In Progress" };
    }
  };

  const getPriorityClass = (priority: string) => {
    switch ((priority || "").toLowerCase()) {
      case "urgent": return "priority-urgent";
      case "high": return "priority-high";
      case "low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    if (dateStr === todayStr) return "Today, " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dateStr === yesterdayStr) return "Yesterday";

    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    }
    return dateStr;
  };

  // Calendar Calculations
  const calendarMonths = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleCalendarToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setCalendarSelectedDate(getTodayStr());
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    // Monday-based start: (getDay() + 6) % 7
    const firstDayIndex = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
    
    const list: Array<{ day: number | null; dateStr: string }> = [];

    // Empty paddings for first week
    for (let i = 0; i < firstDayIndex; i++) {
      list.push({ day: null, dateStr: "" });
    }

    // Days list
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(calendarMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      list.push({
        day,
        dateStr: `${calendarYear}-${monthStr}-${dayStr}`,
      });
    }

    return list;
  }, [calendarYear, calendarMonth]);

  // Calendar calculations of month stats
  const calendarMonthStats = useMemo(() => {
    const prefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;
    const monthEntries = entries.filter((e) => e.date?.startsWith(prefix));

    const uniqueDays = new Set<string>();
    let totalHours = 0;
    let completedCount = 0;
    const leaveDays = new Set<string>();

    monthEntries.forEach((e) => {
      if (e.status === "Leave") {
        leaveDays.add(e.date);
      } else {
        uniqueDays.add(e.date);
        totalHours += Number(e.hoursWorked) || 0;
        if (e.status === "Completed") completedCount++;
      }
    });

    return {
      workingDaysCount: uniqueDays.size,
      leaveDaysCount: leaveDays.size,
      totalHours: Number(totalHours.toFixed(1)),
      completedCount,
    };
  }, [entries, calendarYear, calendarMonth]);

  const calendarSelectedDayEntries = useMemo(() => {
    return entries.filter((e) => e.date === calendarSelectedDate);
  }, [entries, calendarSelectedDate]);

  // Export handlers
  const handleExportExcel = () => {
    if (sortedEntries.length === 0) {
      showToast("No entries to export", "error");
      return;
    }

    const rows = sortedEntries.map((e) => ({
      "Date": e.date,
      "Project Name": e.projectName,
      "Work Description": e.work,
      "Status": e.status,
      "Hours": e.hoursWorked || 0,
      "Priority": e.priority || "Medium",
      "Remarks": e.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 22 }, // Project
      { wch: 45 }, // Work
      { wch: 15 }, // Status
      { wch: 8 },  // Hours
      { wch: 12 }, // Priority
      { wch: 30 }, // Remarks
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Worksheet");
    const fileName = `Worksheet_${getTodayStr()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`Exported ${sortedEntries.length} rows to ${fileName}`, "success");
  };

  const handleExportCsv = () => {
    if (sortedEntries.length === 0) {
      showToast("No entries to export", "error");
      return;
    }

    const headers = ["Date", "Project Name", "Work Description", "Status", "Hours", "Priority", "Remarks"];
    const rows = sortedEntries.map((e) => [
      e.date,
      `"${(e.projectName || "").replace(/"/g, '""')}"`,
      `"${(e.work || "").replace(/"/g, '""')}"`,
      e.status,
      e.hoursWorked || 0,
      e.priority || "Medium",
      `"${(e.remarks || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Worksheet_${getTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV successfully!", "success");
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WorkPulse_Backup_${getTodayStr()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("JSON backup exported successfully!", "success");
  };

  // Import Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".json")) {
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          const list = json.map((item) => ({
            date: item.date || getTodayStr(),
            projectName: item.projectName || item.project_name || "General",
            work: item.work || item.description || "",
            status: item.status || "In Progress",
            hoursWorked: parseFloat(item.hoursWorked || item.hours_worked || 0),
            priority: item.priority || "Medium",
            remarks: item.remarks || "",
          }));
          setParsedImportData(list);
          showToast(`JSON parsed successfully! ${list.length} rows loaded.`, "info");
        } else {
          showToast("Invalid JSON structure", "error");
        }
      } catch (err) {
        showToast("Failed to parse JSON file", "error");
      }
    } else if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const list = mapImportRows(results.data);
          setParsedImportData(list);
          showToast(`CSV parsed! ${list.length} rows loaded.`, "info");
        },
        error: (err) => showToast(`CSV parse error: ${err.message}`, "error"),
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);
      const list = mapImportRows(json);
      setParsedImportData(list);
      showToast(`Excel parsed! ${list.length} rows loaded.`, "info");
    } else {
      showToast("Unsupported file type", "error");
    }
  };

  const mapImportRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const normalized: { [key: string]: any } = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().toLowerCase();
        normalized[cleanKey] = row[key];
      });

      const dateVal = normalized["date"] || normalized["work date"] || normalized["day"] || getTodayStr();
      const projectVal = normalized["project name"] || normalized["project"] || normalized["client"] || "General";
      const workVal = normalized["work description"] || normalized["work"] || normalized["task"] || normalized["description"] || normalized["work done"] || "";

      let statusVal = normalized["status"] || normalized["work status"] || "In Progress";
      if (typeof statusVal === "string") {
        const s = statusVal.trim().toLowerCase();
        if (s.includes("comp") || s.includes("done")) statusVal = "Completed";
        else if (s.includes("prog")) statusVal = "In Progress";
        else if (s.includes("pend")) statusVal = "Pending";
        else if (s.includes("block")) statusVal = "Blocked";
        else if (s.includes("rev")) statusVal = "Under Review";
      }

      const hoursVal = parseFloat(normalized["hours"] || normalized["hours worked"] || normalized["duration"] || normalized["time"] || 0);
      const priorityVal = normalized["priority"] || "Medium";
      const remarksVal = normalized["remarks"] || normalized["notes"] || normalized["blockers"] || "";

      return {
        date: String(dateVal).substring(0, 10),
        projectName: String(projectVal).trim(),
        work: String(workVal).trim(),
        status: statusVal,
        hoursWorked: isNaN(hoursVal) ? 0 : hoursVal,
        priority: priorityVal,
        remarks: String(remarksVal).trim(),
      };
    }).filter((item) => item.work.length > 0 || item.projectName.length > 0);
  };

  const confirmImport = async () => {
    if (parsedImportData.length === 0) return;
    try {
      showToast("Uploading data to Neon DB...", "info");
      const success = await bulkImportEntries(parsedImportData);
      if (success) {
        showToast(`Imported ${parsedImportData.length} records successfully!`, "success");
        confetti({ particleCount: 120, spread: 80 });
        setIsImportExportOpen(false);
        setParsedImportData([]);
        // Reload
        const updated = await getWorksheetEntries(userScope);
        setEntries(updated);
      } else {
        showToast("Database import failed", "error");
      }
    } catch (err: any) {
      showToast("Import error: " + err.message, "error");
    }
  };

  // Daily Status Report Compiler
  const dailyReportText = useMemo(() => {
    const dayEntries = entries.filter((e) => e.date === reportDate);
    const dayMetrics = entries.length > 0 ? entries.filter(e => e.date === reportDate) : [];
    const formattedDate = formatDisplayDate(reportDate);

    if (dayEntries.length === 0) {
      return `📅 Daily Status Report - ${formattedDate}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\nNo tasks recorded for this date.`;
    }

    const completed = dayEntries.filter((e) => e.status === "Completed");
    const inProgress = dayEntries.filter((e) => e.status === "In Progress");
    const pending = dayEntries.filter((e) => e.status === "Pending");
    const blocked = dayEntries.filter((e) => e.status === "Blocked");
    const review = dayEntries.filter((e) => e.status === "Under Review");
    const leave = dayEntries.filter((e) => e.status === "Leave");

    let totalHrs = 0;
    dayEntries.forEach(e => totalHrs += Number(e.hoursWorked) || 0);

    if (reportFormat === "compact") {
      const lines = [`📋 Daily Status (${formattedDate})`];
      dayEntries.forEach((e) => {
        const icon = e.status === "Completed" ? "✅" : (e.status === "In Progress" ? "🔄" : (e.status === "Leave" ? "🏖️" : "⏳"));
        lines.push(`${icon} [${e.projectName}] ${e.work} (${e.hoursWorked || 0}h)`);
      });
      lines.push(`Total: ${dayEntries.length} tasks | ${totalHrs} hrs`);
      return lines.join("\n");
    }

    if (reportFormat === "bullets") {
      const lines = [`*Work Report - ${formattedDate}*`];
      if (completed.length > 0) {
        lines.push(`\n*Completed:*`);
        completed.forEach((e) => lines.push(`• [${e.projectName}] ${e.work}`));
      }
      if (inProgress.length > 0) {
        lines.push(`\n*In Progress / Doing:*`);
        inProgress.forEach((e) => lines.push(`• [${e.projectName}] ${e.work}`));
      }
      if (pending.length > 0 || blocked.length > 0) {
        lines.push(`\n*Pending / Blocked:*`);
        [...pending, ...blocked].forEach((e) => lines.push(`• [${e.projectName}] ${e.work} ${e.remarks ? `(${e.remarks})` : ""}`));
      }
      if (leave.length > 0) {
        lines.push(`\n*Leave / Off:*`);
        leave.forEach((e) => lines.push(`• 🏖️ ${e.work}`));
      }
      return lines.join("\n");
    }

    // Standard Formatted Mode
    const output = [];
    output.push(`📋 DAILY OFFICE STATUS REPORT`);
    output.push(`📅 Date: ${formattedDate}`);
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (leave.length > 0 && completed.length === 0 && inProgress.length === 0) {
      output.push(`\n🏖️ STATUS: ${leave[0].work || "Official Leave / Off"}`);
      output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return output.join("\n");
    }

    if (completed.length > 0) {
      output.push(`\n✅ COMPLETED TASKS (${completed.length}):`);
      completed.forEach((e) => {
        const hrs = e.hoursWorked ? ` [${e.hoursWorked}h]` : "";
        output.push(`• [${e.projectName}] ${e.work}${hrs}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (inProgress.length > 0) {
      output.push(`\n🔄 IN PROGRESS (${inProgress.length}):`);
      inProgress.forEach((e) => {
        const hrs = e.hoursWorked ? ` [${e.hoursWorked}h]` : "";
        output.push(`• [${e.projectName}] ${e.work}${hrs}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (pending.length > 0) {
      output.push(`\n⏳ PENDING / UPCOMING (${pending.length}):`);
      pending.forEach((e) => {
        output.push(`• [${e.projectName}] ${e.work}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (blocked.length > 0) {
      output.push(`\n🛑 BLOCKED / NEED HELP (${blocked.length}):`);
      blocked.forEach((e) => {
        output.push(`• [${e.projectName}] ${e.work}`);
        if (e.remarks) output.push(`  ↳ Blocker: ${e.remarks}`);
      });
    }

    if (review.length > 0) {
      output.push(`\n🔍 UNDER REVIEW (${review.length}):`);
      review.forEach((e) => {
        output.push(`• [${e.projectName}] ${e.work}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (leave.length > 0) {
      output.push(`\n🏖️ LEAVES / OUT OF OFFICE (${leave.length}):`);
      leave.forEach((e) => {
        output.push(`• ${e.work}`);
      });
    }

    output.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    output.push(`📊 Summary: ${dayEntries.length} total entries | Total hours logged: ${totalHrs}h`);
    return output.join("\n");
  }, [entries, reportDate, reportFormat]);

  const copyReportToClipboard = () => {
    navigator.clipboard.writeText(dailyReportText).then(() => {
      showToast("Daily Report copied to clipboard! Ready to paste.", "success");
    }).catch(() => {
      showToast("Failed to copy text", "error");
    });
  };

  // Sorting Handler
  const handleSort = (field: "date" | "projectName" | "status" | "hoursWorked") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Open Daily Report modal
  const openDailyReportModal = () => {
    setIsReportModalOpen(true);
  };

  // Analytics Chart Data Configuration
  const donutChartData = useMemo(() => {
    const counts = metrics.statusCounts;
    const labels = Object.keys(counts);
    const data = Object.values(counts);

    return {
      labels,
      datasets: [
        {
          label: "Tasks Count",
          data,
          backgroundColor: [
            "#10b981", // Completed (Emerald)
            "#3b82f6", // In Progress (Blue)
            "#f59e0b", // Pending (Amber)
            "#ef4444", // Blocked (Red)
            "#8b5cf6", // Under Review (Purple)
            "#64748b", // Leave (Slate)
          ],
          borderColor: theme === "theme-dark" ? "#131b2e" : "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [metrics, theme]);

  const barChartData = useMemo(() => {
    const map = metrics.projectHoursMap;
    // Sort projects by hours descending, take top 8
    const sortedProj = Object.keys(map)
      .map(k => ({ name: k, hours: map[k] }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);

    const labels = sortedProj.map(p => p.name);
    const data = sortedProj.map(p => p.hours);

    return {
      labels,
      datasets: [
        {
          label: "Hours Worked",
          data,
          backgroundColor: "#3b82f6",
          borderRadius: 6,
          borderWidth: 0,
        },
      ],
    };
  }, [metrics]);

  return (
    <div id="app" className="app-container">
      
      {/* Top Navigation Header */}
      <header className="app-header">
        <div className="header-inner container">
          {/* Logo & Branding */}
          <div className="brand-section">
            <div className="brand-logo">
              <Briefcase className="brand-icon" />
            </div>
            <div className="brand-text">
              <div className="brand-title-row">
                <h1 className="brand-title">WorkPulse</h1>
                <span className="badge-tag">Office Daily</span>
              </div>
              <p className="brand-subtitle">Daily Worksheet & Neon DB Manager</p>
            </div>
          </div>

          {/* Cloud Sync & Status Bar */}
          <div className="header-center-info">
            <button 
              id="btnCloudStatus" 
              className={`cloud-status-pill ${dbConnected ? "connected" : "local"}`} 
              title="Click to view Database Settings"
              onClick={() => setIsCloudModalOpen(true)}
            >
              <span className="status-dot"></span>
              <span id="cloudStatusText" className="status-label">
                {dbConnected ? "Neon DB Online" : "Local Mode"}
              </span>
              <Cloud className="icon-sm" />
            </button>
            <button 
              id="btnSyncNow" 
              className={`btn-icon btn-icon-sm ${isSyncing ? "pulse-anim" : ""}`} 
              title="Sync with Neon DB Online Now" 
              aria-label="Sync Now"
              onClick={syncWithDatabase}
            >
              <RefreshCw id="syncIcon" className={`icon-xs ${isSyncing ? "spin-anim" : ""}`} />
            </button>
            <div className="current-date-pill" id="currentDateDisplay">
              <CalendarIcon className="icon-sm" />
              <span id="headerTodayText">{formatDisplayDate(getTodayStr())}</span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="header-actions">
            <button 
              id="btnOpenReport" 
              className="btn btn-outline btn-sm" 
              title="Generate formatted daily report for WhatsApp/Slack"
              onClick={openDailyReportModal}
            >
              <FileText className="icon-sm" />
              <span className="btn-text">Daily Report</span>
            </button>
            
            <button 
              id="btnOpenImportExport" 
              className="btn btn-outline btn-sm" 
              title="Import / Export Excel and CSV data"
              onClick={() => {
                setIsImportExportOpen(true);
                setActiveIeTab("export");
              }}
            >
              <ArrowUpDown className="icon-sm" />
              <span className="btn-text">Import / Export</span>
            </button>

            <button 
              id="btnOpenCloudModal" 
              className="btn btn-outline btn-sm cloud-btn" 
              title="Neon Database Settings"
              onClick={() => setIsCloudModalOpen(true)}
            >
              <Database className="icon-sm" />
              <span className="btn-text">Server Status</span>
            </button>

            <button 
              id="btnToggleTheme" 
              className="btn-icon" 
              title="Toggle Dark/Light Mode" 
              aria-label="Toggle Theme"
              onClick={toggleTheme}
            >
              {theme === "theme-dark" ? <SunIcon id="themeIcon" /> : <Moon id="themeIcon" />}
            </button>

            <button 
              id="btnNewWorksheetEntry" 
              className="btn btn-primary btn-sm btn-glow"
              onClick={() => openWorkModal()}
            >
              <PlusCircle className="icon-sm" />
              <span>Log Work</span>
            </button>

            <div className="user-profile-wrapper" style={{ position: "relative", marginLeft: "0.25rem" }}>
              <button 
                id="btnUserProfile" 
                className="user-profile-btn" 
                title="Click to switch account or add friend profile"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <span 
                  className="user-avatar-badge" 
                  id="headerUserAvatar" 
                  style={{ backgroundColor: currentUser.color || "#3b82f6" }}
                >
                  {currentUser.avatar || (currentUser.name || currentUser.email).charAt(0).toUpperCase()}
                </span>
                <span className="user-name-label" id="headerUserName">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </span>
                <ChevronDown className="icon-xs" />
              </button>

              {isUserDropdownOpen && (
                <div className="user-dropdown-menu" id="userDropdownMenu" style={{ display: "block" }}>
                  <div className="user-dropdown-header">
                    <div 
                      className="user-avatar-large" 
                      id="dropdownUserAvatar" 
                      style={{ backgroundColor: currentUser.color || "#3b82f6" }}
                    >
                      {currentUser.avatar || (currentUser.name || currentUser.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="dropdown-user-name" id="dropdownUserName">
                        {currentUser.name || currentUser.email.split('@')[0]}
                      </div>
                      <div className="dropdown-user-role" id="dropdownUserRole">
                        {currentUser.role || "Team Member"}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item" 
                    id="btnDropdownSwitchUser"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      setActiveUserAuthTab("switch");
                      setIsUserAuthModalOpen(true);
                    }}
                  >
                    <Users className="icon-sm" />
                    <span>Switch User Account</span>
                  </button>
                  <button 
                    className="dropdown-item" 
                    id="btnDropdownAddUser"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      setActiveUserAuthTab("new");
                      setIsUserAuthModalOpen(true);
                    }}
                  >
                    <UserPlus className="icon-sm" />
                    <span>Add Friend / New Profile</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item" 
                    id="btnDropdownLogout" 
                    style={{ color: "#ef4444" }}
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="icon-sm" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content container">
        
        {/* Summary Metrics Bar */}
        <section className="metrics-grid">
          <div className="metric-card metric-total">
            <div className="metric-icon-wrap bg-blue-light">
              <ListTodo className="text-blue icon-md" />
            </div>
            <div className="metric-details">
              <span className="metric-label">Total Tasks</span>
              <div className="metric-value-row">
                <span className="metric-value" id="metricTotalTasks">{metrics.totalTasks}</span>
                <span className="metric-sub" id="metricFilterContext">{dateFilterContextLabel}</span>
              </div>
            </div>
          </div>

          <div className="metric-card metric-completed">
            <div className="metric-icon-wrap bg-emerald-light">
              <CheckCircle2 className="text-emerald icon-md" />
            </div>
            <div className="metric-details">
              <span className="metric-label">Completed</span>
              <div className="metric-value-row">
                <span className="metric-value" id="metricCompletedTasks">{metrics.completedCount}</span>
                <span className="metric-badge bg-emerald-badge" id="metricCompletionRate">{metrics.completionRate}%</span>
              </div>
            </div>
          </div>

          <div className="metric-card metric-progress">
            <div className="metric-icon-wrap bg-sky-light">
              <Clock className="text-sky icon-md" />
            </div>
            <div className="metric-details">
              <span className="metric-label">In Progress / Pending</span>
              <div className="metric-value-row">
                <span className="metric-value" id="metricInProgressTasks">{metrics.inProgressCount}</span>
                <span className="metric-sub" id="metricPendingSub">{metrics.pendingCount} pending</span>
              </div>
            </div>
          </div>

          <div className="metric-card metric-hours">
            <div className="metric-icon-wrap bg-amber-light">
              <Timer className="text-amber icon-md" />
            </div>
            <div className="metric-details">
              <span className="metric-label">Hours Logged</span>
              <div className="metric-value-row">
                <span className="metric-value" id="metricTotalHours">{metrics.totalHours}</span>
                <span className="metric-sub">hrs</span>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Filter & Control Bar */}
        <section className="control-panel">
          <div className="filters-row">
            
            {/* User Workspace Scope Selector */}
            <div className="date-pills-group" id="userScopePills">
              <button 
                className={`filter-pill ${userScope === "me" ? "active" : ""}`} 
                onClick={() => handleScopeChange("me")}
                id="pillScopeMe"
              >
                <User className="icon-xs" style={{ marginRight: "4px" }} />
                <span>My Worksheet</span>
              </button>
              <button 
                className={`filter-pill ${userScope === "all" ? "active" : ""}`} 
                onClick={() => handleScopeChange("all")}
                id="pillScopeAll"
              >
                <Users className="icon-xs" style={{ marginRight: "4px" }} />
                <span>All Friends / Team</span>
              </button>
            </div>

            {/* Date Filter Pills */}
            <div className="date-pills-group" id="dateFilterPills">
              <button className={`filter-pill ${dateFilter === "today" ? "active" : ""}`} onClick={() => setDateFilter("today")}>Today</button>
              <button className={`filter-pill ${dateFilter === "yesterday" ? "active" : ""}`} onClick={() => setDateFilter("yesterday")}>Yesterday</button>
              <button className={`filter-pill ${dateFilter === "this-week" ? "active" : ""}`} onClick={() => setDateFilter("this-week")}>This Week</button>
              <button className={`filter-pill ${dateFilter === "this-month" ? "active" : ""}`} onClick={() => setDateFilter("this-month")}>This Month</button>
              <button className={`filter-pill ${dateFilter === "all" ? "active" : ""}`} onClick={() => setDateFilter("all")}>All Dates</button>
              <button className={`filter-pill ${dateFilter === "custom" ? "active" : ""}`} onClick={() => setDateFilter("custom")}>
                <CalendarIcon className="icon-xs" style={{ marginRight: "4px" }} />
                <span>Custom Date</span>
              </button>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === "custom" && (
              <div className="custom-date-container" id="customDateContainer">
                <div className="date-input-wrap">
                  <label htmlFor="filterStartDate">From</label>
                  <input 
                    type="date" 
                    id="filterStartDate" 
                    className="form-input-sm"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-wrap">
                  <label htmlFor="filterEndDate">To</label>
                  <input 
                    type="date" 
                    id="filterEndDate" 
                    className="form-input-sm"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
                <button 
                  id="btnCloseCustomDate" 
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setDateFilter("today");
                  }}
                >
                  <X className="icon-sm" />
                </button>
              </div>
            )}

            {/* Quick Actions & Carry Forward */}
            <div className="panel-secondary-actions">
              <button 
                id="btnCarryForward" 
                className="btn btn-outline btn-sm btn-subtle" 
                title="Bring unfinished tasks from yesterday into today's worksheet"
                onClick={handleCarryForward}
              >
                <CornerDownRight className="icon-sm" />
                <span className="btn-text">Carry Forward Pending</span>
              </button>
            </div>
          </div>

          <div className="search-and-view-row">
            {/* Search input */}
            <div className="search-input-wrap">
              <Search className="search-icon icon-sm" />
              <input 
                type="text" 
                id="searchInput" 
                className="search-input" 
                placeholder="Search project name, tasks, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  id="btnClearSearch" 
                  className="btn-clear" 
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="icon-xs" />
                </button>
              )}
            </div>

            {/* Project Filter Dropdown */}
            <div className="select-wrap">
              <select 
                id="filterProject" 
                className="form-select-sm"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">All Projects</option>
                {uniqueProjects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="select-wrap">
              <select 
                id="filterStatus" 
                className="form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Blocked">Blocked</option>
                <option value="Under Review">Under Review</option>
                <option value="Leave">🏖️ Leave / Off</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="view-switcher" role="tablist">
              <button 
                className={`view-btn ${currentView === "table" ? "active" : ""}`} 
                title="Table View" 
                onClick={() => setCurrentView("table")}
              >
                <TableIcon className="icon-sm" />
              </button>
              <button 
                className={`view-btn ${currentView === "cards" ? "active" : ""}`} 
                title="Mobile / Card View" 
                onClick={() => setCurrentView("cards")}
              >
                <LayoutGrid className="icon-sm" />
              </button>
              <button 
                className={`view-btn ${currentView === "calendar" ? "active" : ""}`} 
                title="Calendar View" 
                onClick={() => setCurrentView("calendar")}
              >
                <CalendarIcon className="icon-sm" />
              </button>
              <button 
                className={`view-btn ${currentView === "analytics" ? "active" : ""}`} 
                title="Analytics & Charts" 
                onClick={() => setCurrentView("analytics")}
              >
                <BarChart3 className="icon-sm" />
              </button>
            </div>
          </div>
        </section>

        {/* Views Container */}
        <section className="content-view-area">
          
          {/* 1. Table View */}
          {currentView === "table" && sortedEntries.length > 0 && (
            <div id="tableViewContainer" className="view-panel active">
              <div className="table-responsive-card">
                <table className="worksheet-table" id="worksheetTable">
                  <thead>
                    <tr>
                      <th className="col-date" onClick={() => handleSort("date")} style={{ cursor: "pointer" }}>
                        <div className="th-content">Date <ArrowUpDown className="sort-icon icon-xs" /></div>
                      </th>
                      <th className="col-project" onClick={() => handleSort("projectName")} style={{ cursor: "pointer" }}>
                        <div className="th-content">Project Name <ArrowUpDown className="sort-icon icon-xs" /></div>
                      </th>
                      <th className="col-work">Work Description & Notes</th>
                      <th className="col-status" onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                        <div className="th-content">Status <ArrowUpDown className="sort-icon icon-xs" /></div>
                      </th>
                      <th className="col-hours" onClick={() => handleSort("hoursWorked")} style={{ cursor: "pointer" }}>
                        <div className="th-content">Hours <ArrowUpDown className="sort-icon icon-xs" /></div>
                      </th>
                      <th className="col-priority">Priority</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="worksheetTableBody">
                    {sortedEntries.map((e) => {
                      const statusMeta = getStatusMeta(e.status);
                      return (
                        <tr key={e.id}>
                          <td>{formatDisplayDate(e.date)}</td>
                          <td>
                            {userScope === "all" && e.userName && (
                              <span 
                                className="user-badge-pill" 
                                style={{ backgroundColor: e.userColor || "#3b82f6", marginRight: "6px" }}
                              >
                                <User className="icon-xs" style={{ width: "10px", height: "10px", display: "inline", marginRight: "3px" }} />
                                {e.userName}
                              </span>
                            )}
                            <strong>{e.projectName}</strong>
                          </td>
                          <td style={{ whiteSpace: "pre-line" }}>
                            {e.work}
                            {e.remarks && <div className="table-remarks">Remarks: {e.remarks}</div>}
                          </td>
                          <td>
                            {e.userId === currentUser.id ? (
                              <div className="select-wrap table-select-wrap">
                                <select 
                                  value={e.status}
                                  onChange={(evt) => handleStatusChange(e.id, evt.target.value)}
                                  className={`status-badge-inline ${statusMeta.cls}`}
                                >
                                  <option value="Completed">✅ Completed</option>
                                  <option value="In Progress">🔄 In Progress</option>
                                  <option value="Pending">⏳ Pending</option>
                                  <option value="Blocked">🛑 Blocked</option>
                                  <option value="Under Review">🔍 Under Review</option>
                                  <option value="Leave">🏖️ Leave / Off</option>
                                </select>
                              </div>
                            ) : (
                              <span className={`status-badge-inline ${statusMeta.cls}`} style={{ display: "inline-block", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.75rem" }}>
                                {statusMeta.label}
                              </span>
                            )}
                          </td>
                          <td><strong>{e.hoursWorked > 0 ? `${e.hoursWorked}h` : "-"}</strong></td>
                          <td>
                            <span className={`priority-badge ${getPriorityClass(e.priority)}`}>
                              {e.priority}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {e.userId === currentUser.id && (
                                <button className="btn-action" title="Edit entry" onClick={() => openWorkModal(e)}>
                                  <Edit3 className="icon-xs" />
                                </button>
                              )}
                              <button className="btn-action" title="Duplicate task to today" onClick={() => handleDuplicateEntry(e.id)}>
                                <Copy className="icon-xs" />
                              </button>
                              {e.userId === currentUser.id && (
                                <button className="btn-action btn-delete" title="Delete entry" onClick={() => handleDeleteEntry(e.id)}>
                                  <Trash2 className="icon-xs" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Mobile Cards View */}
          {currentView === "cards" && sortedEntries.length > 0 && (
            <div id="cardsViewContainer" className="view-panel active">
              <div className="cards-grid" id="worksheetCardsGrid">
                {sortedEntries.map((e) => {
                  const statusMeta = getStatusMeta(e.status);
                  return (
                    <div className="mobile-card" key={e.id}>
                      <div className="card-header-row">
                        <span className="card-date">{formatDisplayDate(e.date)}</span>
                        <span className={`priority-badge ${getPriorityClass(e.priority)}`}>{e.priority}</span>
                      </div>
                      <h4 className="card-project">
                        {userScope === "all" && e.userName && (
                          <span 
                            className="user-badge-pill" 
                            style={{ backgroundColor: e.userColor || "#3b82f6", marginRight: "6px", fontSize: "0.68rem" }}
                          >
                            <User className="icon-xs" style={{ width: "10px", height: "10px", display: "inline", marginRight: "3px" }} />
                            {e.userName}
                          </span>
                        )}
                        {e.projectName}
                      </h4>
                      <p className="card-work" style={{ whiteSpace: "pre-line" }}>{e.work}</p>
                      {e.remarks && <div className="card-remarks"><strong>Remarks:</strong> {e.remarks}</div>}
                      
                      <div className="card-footer-row">
                        <div className="card-hours">
                          <Timer className="icon-xs" />
                          <span>{e.hoursWorked > 0 ? `${e.hoursWorked} hrs` : "0 hrs"}</span>
                        </div>
                        <div className="select-wrap">
                          {e.userId === currentUser.id ? (
                            <select 
                              value={e.status}
                              onChange={(evt) => handleStatusChange(e.id, evt.target.value)}
                              className={`status-badge-inline ${statusMeta.cls}`}
                            >
                              <option value="Completed">✅ Completed</option>
                              <option value="In Progress">🔄 In Progress</option>
                              <option value="Pending">⏳ Pending</option>
                              <option value="Blocked">🛑 Blocked</option>
                              <option value="Under Review">🔍 Under Review</option>
                              <option value="Leave">🏖️ Leave / Off</option>
                            </select>
                          ) : (
                            <span className={`status-badge-inline ${statusMeta.cls}`} style={{ display: "inline-block", padding: "0.25rem 0.65rem", borderRadius: "12px", fontSize: "0.75rem" }}>
                              {statusMeta.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="card-action-bar">
                        {e.userId === currentUser.id && (
                          <button className="btn btn-outline btn-xs" onClick={() => openWorkModal(e)}>
                            <Edit3 className="icon-xs" /> Edit
                          </button>
                        )}
                        <button className="btn btn-outline btn-xs" onClick={() => handleDuplicateEntry(e.id)}>
                          <Copy className="icon-xs" /> Duplicate
                        </button>
                        {e.userId === currentUser.id && (
                          <button className="btn btn-outline btn-xs btn-delete" onClick={() => handleDeleteEntry(e.id)}>
                            <Trash2 className="icon-xs" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Calendar View */}
          {currentView === "calendar" && (
            <div id="calendarViewContainer" className="view-panel active">
              <div className="calendar-card">
                {/* Month Header & Controls */}
                <div className="calendar-header-bar">
                  <div className="calendar-nav-left">
                    <button id="btnPrevMonth" className="btn btn-outline btn-sm btn-icon-sm" onClick={handlePrevMonth} aria-label="Previous Month" title="Previous Month">
                      <ChevronLeft className="icon-sm" />
                    </button>
                    <h2 id="calendarMonthTitle" className="calendar-month-title">
                      {calendarMonths[calendarMonth]} {calendarYear}
                    </h2>
                    <button id="btnNextMonth" className="btn btn-outline btn-sm btn-icon-sm" onClick={handleNextMonth} aria-label="Next Month" title="Next Month">
                      <ChevronRight className="icon-sm" />
                    </button>
                    <button id="btnCalendarToday" className="btn btn-outline btn-xs" onClick={handleCalendarToday}>Today</button>
                  </div>

                  {/* Month Summary Stats Strip */}
                  <div className="calendar-month-stats">
                    <div className="cstat-item">
                      <span className="cstat-val text-blue" id="calStatWorkingDays">{calendarMonthStats.workingDaysCount}</span>
                      <span className="cstat-lbl">Work Days</span>
                    </div>
                    <div className="cstat-item">
                      <span className="cstat-val text-emerald" id="calStatCompleted">{calendarMonthStats.completedCount}</span>
                      <span className="cstat-lbl">Completed</span>
                    </div>
                    <div className="cstat-item">
                      <span className="cstat-val text-amber" id="calStatHours">{calendarMonthStats.totalHours}h</span>
                      <span className="cstat-lbl">Hours</span>
                    </div>
                    <div className="cstat-item">
                      <span className="cstat-val text-muted" id="calStatLeave">{calendarMonthStats.leaveDaysCount}</span>
                      <span className="cstat-lbl">Leaves</span>
                    </div>
                  </div>
                </div>

                {/* Calendar Days Header */}
                <div className="calendar-weekdays-grid">
                  <div className="weekday-cell">Mon</div>
                  <div className="weekday-cell">Tue</div>
                  <div className="weekday-cell">Wed</div>
                  <div className="weekday-cell">Thu</div>
                  <div className="weekday-cell">Fri</div>
                  <div className="weekday-cell weekend">Sat</div>
                  <div className="weekday-cell weekend">Sun</div>
                </div>

                {/* Calendar Days Grid */}
                <div className="calendar-days-grid" id="calendarDaysGrid">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.day) {
                      return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
                    }

                    const dayEntries = entries.filter((e) => e.date === cell.dateStr);
                    const isSelected = cell.dateStr === calendarSelectedDate;
                    const isToday = cell.dateStr === getTodayStr();

                    // Status indicators for the day
                    const isLeave = dayEntries.some((e) => e.status === "Leave");
                    const hasCompleted = dayEntries.some((e) => e.status === "Completed");
                    const hasInProgress = dayEntries.some((e) => e.status === "In Progress" || e.status === "Pending" || e.status === "Blocked");

                    let dayClass = "";
                    if (isToday) dayClass += " today";
                    if (isSelected) dayClass += " selected";
                    if (isLeave) dayClass += " leave-day";

                    return (
                      <div 
                        key={cell.dateStr} 
                        className={`calendar-day${dayClass}`}
                        onClick={() => {
                          setCalendarSelectedDate(cell.dateStr);
                          setIsDayInspectorOpen(true);
                        }}
                      >
                        <span className="day-number">{cell.day}</span>
                        {dayEntries.length > 0 && (
                          <div className="day-events-preview">
                            {hasCompleted && <span className="event-dot dot-completed" title="Completed tasks"></span>}
                            {hasInProgress && <span className="event-dot dot-in-progress" title="Tasks in progress"></span>}
                            {isLeave && <span className="event-dot dot-leave" title="On Leave"></span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Inspector Drawer */}
              {isDayInspectorOpen && (
                <div id="calendarDayDetails" className="day-inspector-card">
                  <div className="day-inspector-header">
                    <div className="day-inspector-title-wrap">
                      <CalendarIcon className="text-blue icon-sm" />
                      <h3 id="inspectorDateTitle" className="inspector-date-title">
                        Tasks for {formatDisplayDate(calendarSelectedDate)}
                      </h3>
                    </div>
                    <div className="day-inspector-actions">
                      <button 
                        id="btnAddForSelectedDate" 
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          openWorkModal();
                          setFormDate(calendarSelectedDate);
                        }}
                      >
                        <Plus className="icon-xs" /> Add Log For This Day
                      </button>
                      <button 
                        id="btnCloseDayInspector" 
                        className="btn-action" 
                        aria-label="Close details"
                        onClick={() => setIsDayInspectorOpen(false)}
                      >
                        <X className="icon-sm" />
                      </button>
                    </div>
                  </div>
                  <div id="inspectorTasksList" className="inspector-tasks-list">
                    {calendarSelectedDayEntries.length === 0 ? (
                      <p className="no-inspector-tasks">No tasks logged for this day.</p>
                    ) : (
                      calendarSelectedDayEntries.map((e) => {
                        const statusMeta = getStatusMeta(e.status);
                        return (
                          <div className="inspector-task-item" key={e.id}>
                            <div className="iti-left">
                              <span className={`status-badge-inline ${statusMeta.cls}`} style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
                                {e.status}
                              </span>
                              <strong style={{ marginLeft: "8px" }}>{e.projectName}</strong>
                              <span className="iti-work" style={{ marginLeft: "8px", color: "var(--text-secondary)" }}>
                                - {e.work}
                              </span>
                              {e.hoursWorked > 0 && <span className="iti-hours">({e.hoursWorked}h)</span>}
                            </div>
                            <div className="iti-actions">
                              <button className="btn-action" onClick={() => openWorkModal(e)}>
                                <Edit3 className="icon-xs" />
                              </button>
                              <button className="btn-action btn-delete" onClick={() => handleDeleteEntry(e.id)}>
                                <Trash2 className="icon-xs" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Analytics View */}
          {currentView === "analytics" && (
            <div id="analyticsViewContainer" className="view-panel active">
              <div className="analytics-charts-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Status Breakdown</h3>
                    <span className="chart-subtitle">Distribution of tasks by status</span>
                  </div>
                  <div className="chart-body-donut">
                    <Doughnut 
                      data={donutChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: {
                              color: theme === "theme-dark" ? "#cbd5e1" : "#475569",
                              font: { family: "Inter", size: 11 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Hours by Project</h3>
                    <span className="chart-subtitle">Total time logged across active projects (Top 8)</span>
                  </div>
                  <div className="chart-body-bar">
                    <Bar 
                      data={barChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: theme === "theme-dark" ? "#cbd5e1" : "#475569",
                              font: { family: "Inter", size: 10 }
                            },
                            grid: { display: false }
                          },
                          y: {
                            ticks: {
                              color: theme === "theme-dark" ? "#cbd5e1" : "#475569",
                              font: { family: "Inter", size: 10 }
                            },
                            grid: {
                              color: theme === "theme-dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {sortedEntries.length === 0 && (
            <div id="emptyState" className="empty-state-card">
              <div className="empty-icon-wrap">
                <ListTodo className="icon-lg text-muted" style={{ width: "32px", height: "32px" }} />
              </div>
              <h3 className="empty-title">No worksheet entries found</h3>
              <p className="empty-desc" id="emptyStateDesc">
                There are no work records matching your selected date or filters.
              </p>
              <div className="empty-actions">
                <button id="btnEmptyAdd" className="btn btn-primary" onClick={() => openWorkModal()}>
                  <Plus className="icon-sm" /> Add Work Log
                </button>
                <button id="btnLoadSampleData" className="btn btn-outline" onClick={handleLoadSampleData}>
                  <Plus className="icon-sm text-amber" /> Load Sample Data
                </button>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        id="mobileFabAdd" 
        className="mobile-fab" 
        aria-label="Add new work entry"
        onClick={() => openWorkModal()}
      >
        <Plus className="icon-md" />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mob-nav-item ${dateFilter === "today" && currentView === "cards" ? "active" : ""}`} 
          onClick={() => {
            setDateFilter("today");
            setCurrentView("cards");
          }}
        >
          <SunIcon className="icon-sm" />
          <span>Today</span>
        </button>
        <button 
          className={`mob-nav-item ${dateFilter === "this-week" && currentView === "cards" ? "active" : ""}`} 
          onClick={() => {
            setDateFilter("this-week");
            setCurrentView("cards");
          }}
        >
          <CalendarIcon className="icon-sm" />
          <span>Week</span>
        </button>
        <button 
          className="mob-nav-item" 
          id="mobNavAdd"
          onClick={() => openWorkModal()}
        >
          <div className="mob-nav-add-icon">
            <Plus className="icon-md" />
          </div>
          <span>Log Work</span>
        </button>
        <button 
          className={`mob-nav-item ${currentView === "calendar" ? "active" : ""}`} 
          id="mobNavCalendar"
          onClick={() => setCurrentView("calendar")}
        >
          <CalendarIcon className="icon-sm" />
          <span>Calendar</span>
        </button>
        <button 
          className={`mob-nav-item ${currentView === "analytics" ? "active" : ""}`} 
          id="mobNavAnalytics"
          onClick={() => setCurrentView("analytics")}
        >
          <BarChart3 className="icon-sm" />
          <span>Analytics</span>
        </button>
        <button 
          className="mob-nav-item" 
          id="mobNavCloud"
          onClick={() => setIsCloudModalOpen(true)}
        >
          <Cloud className="icon-sm" />
          <span>Cloud</span>
        </button>
      </nav>

      {/* ================= MODALS ================= */}

      {/* 1. Add / Edit Work Log Modal */}
      {isWorkModalOpen && (
        <div className="modal-overlay" id="workModal">
          <div className="modal-container modal-md" role="dialog" aria-labelledby="workModalTitle">
            <div className="modal-header">
              <div className="modal-header-left">
                <Edit3 className="modal-header-icon icon-sm" />
                <h2 id="workModalTitle" className="modal-title">
                  {formEntryId ? "Edit Work Log" : "Log Daily Work"}
                </h2>
              </div>
              <button className="btn-close-modal" id="btnCloseWorkModal" aria-label="Close modal" onClick={() => setIsWorkModalOpen(false)}>
                <X className="icon-sm" />
              </button>
            </div>

            <form id="workEntryForm" className="modal-form" onSubmit={handleWorkSubmit}>
              {/* Date & Quick Selectors */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="workDate" className="form-label required">Work Date</label>
                  <div className="quick-date-chips">
                    <button type="button" className="chip-btn" onClick={() => setFormDate(getTodayStr())}>Today</button>
                    <button type="button" className="chip-btn" onClick={() => setFormDate(getYesterdayStr())}>Yesterday</button>
                  </div>
                </div>
                <input 
                  type="date" 
                  id="workDate" 
                  className="form-input" 
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              {/* Project Name with Autocomplete Suggestions */}
              <div className="form-group">
                <label htmlFor="projectNameInput" className="form-label required">Project Name / Client</label>
                <div className="input-autocomplete-wrapper">
                  <input 
                    type="text" 
                    id="projectNameInput" 
                    className="form-input" 
                    placeholder="e.g. Website Redesign, Client Portal, CRM" 
                    required 
                    autoComplete="off"
                    value={formProject}
                    onChange={(e) => handleProjectInputChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && projectSuggestions.length > 0 && (
                    <div id="projectSuggestions" className="suggestions-dropdown">
                      {projectSuggestions.map((proj) => (
                        <div 
                          key={proj} 
                          className="suggestion-item"
                          onMouseDown={() => selectProjectSuggestion(proj)}
                        >
                          {proj}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Recent Projects Tags */}
                <div className="project-tags-quick" id="projectQuickTags">
                  {uniqueProjects.slice(0, 5).map((p) => (
                    <button 
                      key={p} 
                      type="button" 
                      className="chip-btn"
                      onClick={() => setFormProject(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Done / Tasks Description */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="workDescription" className="form-label required">Work Description & Tasks Completed</label>
                  <span className="form-hint">Be specific (what was achieved / next steps)</span>
                </div>
                <textarea 
                  id="workDescription" 
                  className="form-textarea" 
                  rows={4} 
                  placeholder="Describe the work done, tasks completed, meetings attended, or issues solved..." 
                  required
                  value={formWork}
                  onChange={(e) => setFormWork(e.target.value)}
                ></textarea>
              </div>

              {/* Status & Hours Row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="workStatus" className="form-label required">Work Status</label>
                  <select 
                    id="workStatus" 
                    className="form-select" 
                    required
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Completed">✅ Completed</option>
                    <option value="In Progress">🔄 In Progress</option>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Blocked">🛑 Blocked</option>
                    <option value="Under Review">🔍 Under Review</option>
                    <option value="Leave">🏖️ Leave / Off</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="workHours" className="form-label">Hours Spent</label>
                  <div className="input-unit-wrap">
                    <input 
                      type="number" 
                      id="workHours" 
                      className="form-input" 
                      min="0" 
                      max="24" 
                      step="0.5" 
                      placeholder="e.g. 3.5"
                      value={formHours}
                      onChange={(e) => setFormHours(e.target.value)}
                    />
                    <span className="unit-text">hrs</span>
                  </div>
                </div>
              </div>

              {/* Priority & Remarks Row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="workPriority" className="form-label">Priority</label>
                  <select 
                    id="workPriority" 
                    className="form-select"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                  >
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="workRemarks" className="form-label">Remarks / Blockers (Optional)</label>
                  <input 
                    type="text" 
                    id="workRemarks" 
                    className="form-input" 
                    placeholder="e.g. Waiting on client API keys"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsWorkModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="btnSaveWorkEntry">
                  <Check className="icon-sm" />
                  <span id="saveBtnText">{formEntryId ? "Update Log" : "Save Work Log"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Cloud Server & Database Settings Modal */}
      {isCloudModalOpen && (
        <div className="modal-overlay" id="cloudModal">
          <div className="modal-container modal-lg" role="dialog" aria-labelledby="cloudModalTitle">
            <div className="modal-header">
              <div className="modal-header-left">
                <Database className="modal-header-icon text-sky icon-sm" />
                <h2 id="cloudModalTitle" className="modal-title">Next.js Server & Neon DB Cloud Storage</h2>
              </div>
              <button className="btn-close-modal" id="btnCloseCloudModal" aria-label="Close modal" onClick={() => setIsCloudModalOpen(false)}>
                <X className="icon-sm" />
              </button>
            </div>

            <div className="modal-body scrollable-modal-body">
              <div className="cloud-info-banner">
                <Activity className="banner-icon icon-md" />
                <div>
                  <strong>Server-Side Secure Connection</strong>
                  <p>Your worksheet tracker is powered by Next.js Server Actions connecting to Neon DB PostgreSQL. Data is securely saved in the cloud without exposing raw credentials in the browser.</p>
                </div>
              </div>

              <div className="config-form-section">
                <h4 className="section-title" style={{ marginTop: "1rem" }}>Connection Status</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "1rem 0" }}>
                  <span className={`status-dot`} style={{
                    backgroundColor: dbConnected ? "var(--accent-emerald)" : "var(--accent-rose)",
                    width: "12px",
                    height: "12px",
                    boxShadow: dbConnected ? "0 0 0 4px rgba(16,185,129,0.2)" : "0 0 0 4px rgba(244,63,94,0.2)"
                  }}></span>
                  <strong style={{ fontSize: "1.1rem" }}>
                    {dbConnected ? "Neon DB PostgreSQL Online" : "Database Disconnected"}
                  </strong>
                </div>

                {!dbConnected && (
                  <div className="setup-details" style={{ display: "block", marginTop: "1rem" }}>
                    <div className="setup-content" style={{ padding: "1rem" }}>
                      <h5 style={{ fontWeight: 600, color: "var(--status-blocked-text)" }}>Missing Database Credentials</h5>
                      <p style={{ fontSize: "0.85rem", margin: "0.5rem 0" }}>
                        Please add a database connection string in your <code>.env</code> file in the project root:
                      </p>
                      <div className="code-box" style={{ background: "var(--bg-subtle)", padding: "0.75rem", borderRadius: "6px" }}>
                        <pre style={{ overflowX: "auto" }}>
                          <code>DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"</code>
                        </pre>
                      </div>
                      <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>
                        Once configured, restart the Next.js server, and the dashboard will automatically sync with Neon DB!
                      </p>
                    </div>
                  </div>
                )}

                {dbConnected && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Database connection successfully established! You are currently using active cloud sync for your daily worksheet records. Feel free to log and manage entries on your laptop, mobile, or tablet!
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setIsCloudModalOpen(false)}>
                <Check className="icon-sm" /> OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Import & Export Modal */}
      {isImportExportOpen && (
        <div className="modal-overlay" id="importExportModal">
          <div className="modal-container modal-md" role="dialog" aria-labelledby="ieModalTitle">
            <div className="modal-header">
              <div className="modal-header-left">
                <ArrowUpDown className="modal-header-icon icon-sm" />
                <h2 id="ieModalTitle" className="modal-title">Import & Export Worksheet Data</h2>
              </div>
              <button className="btn-close-modal" id="btnCloseIEModal" aria-label="Close modal" onClick={() => setIsImportExportOpen(false)}>
                <X className="icon-sm" />
              </button>
            </div>

            <div className="modal-body">
              <div className="ie-tabs" role="tablist">
                <button 
                  className={`ie-tab ${activeIeTab === "export" ? "active" : ""}`} 
                  onClick={() => setActiveIeTab("export")}
                >
                  Export Data
                </button>
                <button 
                  className={`ie-tab ${activeIeTab === "import" ? "active" : ""}`} 
                  onClick={() => {
                    setActiveIeTab("import");
                    setParsedImportData([]);
                  }}
                >
                  Import Data
                </button>
              </div>

              {/* Export Tab */}
              {activeIeTab === "export" && (
                <div id="tabExportContent" className="ie-tab-content active">
                  <p className="tab-desc">Export your filtered or complete daily worksheet records to submit for office reports or backups.</p>
                  
                  <div className="export-options-grid">
                    <button id="btnExportExcel" className="export-card-btn" onClick={handleExportExcel}>
                      <div className="export-icon-box bg-emerald-light">
                        <Sheet className="text-emerald icon-sm" />
                      </div>
                      <div className="export-card-info">
                        <strong>Excel Spreadsheet (.xlsx)</strong>
                        <span>Formatted spreadsheet with columns & headers</span>
                      </div>
                    </button>

                    <button id="btnExportCsv" className="export-card-btn" onClick={handleExportCsv}>
                      <div className="export-icon-box bg-blue-light">
                        <FileSpreadsheet className="text-blue icon-sm" />
                      </div>
                      <div className="export-card-info">
                        <strong>CSV File (.csv)</strong>
                        <span>Universal format for Google Sheets & Excel</span>
                      </div>
                    </button>

                    <button id="btnExportJson" className="export-card-btn" onClick={handleExportJson}>
                      <div className="export-icon-box bg-amber-light">
                        <FileCode className="text-amber icon-sm" />
                      </div>
                      <div className="export-card-info">
                        <strong>JSON Backup (.json)</strong>
                        <span>Full structured backup for cloud migration</span>
                      </div>
                    </button>

                    <button id="btnPrintWorksheet" className="export-card-btn" onClick={() => window.print()}>
                      <div className="export-icon-box bg-purple-light">
                        <Printer className="text-purple icon-sm" />
                      </div>
                      <div className="export-card-info">
                        <strong>Print / Save PDF Report</strong>
                        <span>Clean printable daily office timesheet</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Import Tab */}
              {activeIeTab === "import" && (
                <div id="tabImportContent" className="ie-tab-content active">
                  <p className="tab-desc">Upload a CSV or Excel file to instantly import all your past office worksheet data.</p>
                  
                  <div 
                    className="drop-zone" 
                    id="fileDropZone"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: "pointer" }}
                  >
                    <UploadCloud className="drop-icon icon-lg" style={{ color: "var(--brand-primary)" }} />
                    <p className="drop-title">Drag & Drop your CSV or Excel file here</p>
                    <p className="drop-sub">or click to browse files from your computer</p>
                    <input 
                      type="file" 
                      id="importFileInput" 
                      accept=".csv, .xlsx, .xls, .json" 
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: "10px" }}>Choose File</button>
                  </div>

                  <div className="import-format-guide">
                    <span className="guide-title">Supported Columns in CSV / Excel:</span>
                    <p className="guide-sample"><code>Date, Project Name, Work Description, Status, Hours, Priority, Remarks</code></p>
                  </div>

                  {parsedImportData.length > 0 && (
                    <div id="importPreviewArea" className="import-preview-box active">
                      <div className="preview-header">
                        <span id="importPreviewCount">{parsedImportData.length} row(s) found</span>
                        <button type="button" id="btnConfirmImport" className="btn btn-primary btn-sm" onClick={confirmImport}>
                          Confirm Import
                        </button>
                      </div>
                      <div className="preview-table-wrap" id="previewTableWrap" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        <table className="worksheet-table" style={{ fontSize: "0.75rem" }}>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Project</th>
                              <th>Work</th>
                              <th>Status</th>
                              <th>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedImportData.slice(0, 5).map((r, i) => (
                              <tr key={i}>
                                <td>{r.date}</td>
                                <td><strong>{r.projectName}</strong></td>
                                <td>{r.work.length > 40 ? r.work.substring(0, 40) + "..." : r.work}</td>
                                <td>{r.status}</td>
                                <td>{r.hoursWorked}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedImportData.length > 5 && (
                          <div style={{ padding: "8px", fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>
                            ... and {parsedImportData.length - 5} more rows.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setIsImportExportOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Daily Status Report Generator Modal */}
      {isReportModalOpen && (
        <div className="modal-overlay" id="reportModal">
          <div className="modal-container modal-md" role="dialog" aria-labelledby="reportModalTitle">
            <div className="modal-header">
              <div className="modal-header-left">
                <MessageSquare className="modal-header-icon text-emerald icon-sm" />
                <h2 id="reportModalTitle" className="modal-title">Daily Office Status Report</h2>
              </div>
              <button className="btn-close-modal" id="btnCloseReportModal" aria-label="Close modal" onClick={() => setIsReportModalOpen(false)}>
                <X className="icon-sm" />
              </button>
            </div>

            <div className="modal-body">
              <div className="report-header-controls">
                <label htmlFor="reportDateSelect" className="form-label-inline">Report Date:</label>
                <select 
                  id="reportDateSelect" 
                  className="form-select-sm"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                >
                  <option value={getTodayStr()}>Today ({formatDisplayDate(getTodayStr())})</option>
                  {uniqueDates.filter(d => d !== getTodayStr()).map((d) => (
                    <option key={d} value={d}>{formatDisplayDate(d)}</option>
                  ))}
                </select>
                <div className="report-format-toggle">
                  <button 
                    className={`btn-xs format-btn ${reportFormat === "standard" ? "active" : ""}`}
                    onClick={() => setReportFormat("standard")}
                  >
                    Standard
                  </button>
                  <button 
                    className={`btn-xs format-btn ${reportFormat === "compact" ? "active" : ""}`}
                    onClick={() => setReportFormat("compact")}
                  >
                    Compact
                  </button>
                  <button 
                    className={`btn-xs format-btn ${reportFormat === "bullets" ? "active" : ""}`}
                    onClick={() => setReportFormat("bullets")}
                  >
                    Bullets
                  </button>
                </div>
              </div>

              <div className="report-preview-box">
                <textarea 
                  id="dailyReportText" 
                  className="report-textarea" 
                  rows={12} 
                  readOnly
                  value={dailyReportText}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setIsReportModalOpen(false)}>Close</button>
              <button type="button" className="btn btn-primary" id="btnCopyDailyReport" onClick={copyReportToClipboard}>
                <Copy className="icon-sm" />
                <span>Copy to Clipboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. User Account Switcher & Profile Modal */}
      {isUserAuthModalOpen && (
        <div className="modal-overlay" id="userAuthModal">
          <div className="modal-container modal-md" role="dialog" aria-labelledby="userModalTitle">
            <div className="modal-header">
              <div className="modal-header-left">
                <Users className="modal-header-icon text-blue icon-sm" />
                <h2 id="userModalTitle" className="modal-title">User Accounts & Profiles</h2>
              </div>
              <button 
                className="btn-close-modal" 
                id="btnCloseUserModal" 
                aria-label="Close modal" 
                onClick={() => setIsUserAuthModalOpen(false)}
              >
                <X className="icon-sm" />
              </button>
            </div>

            <div className="modal-body">
              <div className="user-tabs-nav">
                <button 
                  className={`user-tab-btn ${activeUserAuthTab === "switch" ? "active" : ""}`} 
                  id="tabBtnSwitchUser"
                  onClick={() => setActiveUserAuthTab("switch")}
                >
                  👥 Switch User
                </button>
                <button 
                  className={`user-tab-btn ${activeUserAuthTab === "new" ? "active" : ""}`} 
                  id="tabBtnNewUser"
                  onClick={() => setActiveUserAuthTab("new")}
                >
                  ➕ New Profile
                </button>
              </div>

              {/* Tab 1: Switch Account */}
              {activeUserAuthTab === "switch" && (
                <div id="tabContentSwitchUser" className="user-tab-pane">
                  <p className="section-hint" style={{ marginBottom: "0.85rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    Select an account below to view their personal worksheet or separate records:
                  </p>
                  <div className="users-list-grid" id="usersListContainer">
                    {allUsers.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>No user profiles found.</p>
                    ) : (
                      allUsers.map((user) => {
                        const initial = (user.name || "U").charAt(0).toUpperCase();
                        const isActive = user.id === currentUser.id;
                        return (
                          <div 
                            key={user.id} 
                            className={`user-profile-card ${isActive ? "active" : ""}`}
                            onClick={() => handleSwitchUser(user.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="user-card-info">
                              <div 
                                className="user-avatar-large" 
                                style={{ 
                                  backgroundColor: user.color || "#3b82f6", 
                                  width: "34px", 
                                  height: "34px", 
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyItems: "center"
                                }}
                              >
                                {initial}
                              </div>
                              <div>
                                <div className="user-card-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <strong>{user.name}</strong>
                                  {isActive && <span style={{ fontSize: "0.72rem", color: "var(--brand-primary)", fontWeight: "normal" }}>(Active)</span>}
                                </div>
                                <div className="user-card-role">@{user.username} • {user.role || "Member"}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <button 
                                className={`btn btn-xs ${isActive ? "btn-primary" : "btn-outline"} btn-select-user`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSwitchUser(user.id);
                                }}
                              >
                                {isActive ? "✓ Active" : "Switch"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Register New Profile */}
              {activeUserAuthTab === "new" && (
                <div id="tabContentNewUser" className="user-tab-pane">
                  <form id="newUserForm" className="modal-form" onSubmit={handleAddFriendProfile}>
                    <div className="form-group">
                      <label htmlFor="newUserName" className="form-label required">Display Name</label>
                      <input 
                        type="text" 
                        name="name"
                        id="newUserName" 
                        className="form-input" 
                        placeholder="e.g. Rahul Sharma, Priya" 
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="newUserUsername" className="form-label required">Username (Unique ID)</label>
                      <input 
                        type="text" 
                        name="username"
                        id="newUserUsername" 
                        className="form-input" 
                        placeholder="e.g. rahul, priya_dev" 
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="newUserRole" className="form-label">Role / Designation</label>
                      <input 
                        type="text" 
                        name="role"
                        id="newUserRole" 
                        className="form-input" 
                        placeholder="e.g. Frontend Developer, QA Engineer" 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Profile Avatar Color</label>
                      <div className="color-picker-row">
                        {["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"].map((color) => (
                          <label 
                            key={color} 
                            className={`color-circle ${selectedAvatarColor === color ? "selected" : ""}`} 
                            style={{ backgroundColor: color, cursor: "pointer", position: "relative" }}
                          >
                            <input 
                              type="radio" 
                              name="userColor" 
                              value={color}
                              checked={selectedAvatarColor === color}
                              onChange={() => setSelectedAvatarColor(color)}
                              style={{ opacity: 0, position: "absolute", width: "100%", height: "100%", cursor: "pointer" }}
                            />
                            {selectedAvatarColor === color && (
                              <span className="selected-dot"></span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="modal-footer" style={{ borderTop: "none", marginTop: "1rem", padding: "10px 0 0 0" }}>
                      <button type="submit" className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <UserPlus className="icon-sm" />
                        <span>Create & Switch to Profile</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div id="toastContainer" className="toast-container" aria-live="polite">
          <div className={`toast toast-${toast.type} active`}>
            {toast.type === "success" && <CheckCircle2 className="icon-sm" />}
            {toast.type === "error" && <AlertOctagon className="icon-sm" />}
            {toast.type === "info" && <Clock className="icon-sm" />}
            <span className="toast-message" style={{ marginLeft: "8px" }}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Spin/Pulse keyframes for sync animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        .pulse-anim {
          animation: pulse 1s infinite alternate;
        }
        .no-inspector-tasks {
          color: var(--text-muted);
          font-style: italic;
          padding: 10px 0;
        }
        .suggestions-dropdown {
          position: absolute;
          width: 100%;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          z-index: 100;
          max-height: 150px;
          overflow-y: auto;
          box-shadow: var(--shadow-md);
        }
        .suggestion-item {
          padding: 8px 12px;
          font-size: 0.85rem;
          cursor: pointer;
          color: var(--text-primary);
        }
        .suggestion-item:hover {
          background-color: var(--bg-hover);
        }
        .table-remarks {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .card-remarks {
          font-size: 0.8rem;
          color: var(--text-muted);
          background-color: var(--bg-subtle);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          margin-top: 8px;
        }
      `}</style>

    </div>
  );
}
