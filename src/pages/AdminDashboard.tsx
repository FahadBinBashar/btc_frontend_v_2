import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  CalendarDays,
  LogOut,
  UserCog,
  Download,
  Trash2,
  CheckSquare,
  Smartphone,
  ArrowLeftRight,
  UserPlus,
  Eye,
  Loader2,
  FileImage,
  Banknote,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import SubscriberUploadDialog from "@/components/admin/SubscriberUploadDialog";

const SUPER_ADMIN_EMAIL = 'shawn@guidepoint.co.bw';

const formatMsisdn = (msisdn: string | null | undefined): string => {
  if (!msisdn) return "-";
  const cleaned = msisdn.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("267") && cleaned.length >= 10) return `+${cleaned}`;
  if (/^\d{7,8}$/.test(cleaned)) return `+267${cleaned}`;
  return `+${cleaned}`;
};

interface KYCRecord {
  id: string;
  msisdn: string | null;
  metadata?: any;
  document_photos?: Array<{ path?: string; url?: string; type?: string; label?: string }>;
  selfie_url?: string | null;
  document_photo_urls?: string[] | null;
  country: string | null;
  country_abbreviation: string | null;
  full_name: string | null;
  first_name: string | null;
  surname: string | null;
  date_of_birth: string | null;
  sex: string | null;
  document_type: "omang" | "passport";
  document_number: string | null;
  physical_address: string | null;
  postal_address: string | null;
  date_of_issue: string | null;
  expiry_date: string | null;
  email: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relation: string | null;
  next_of_kin_phone: string | null;
  plot_number: string | null;
  ward: string | null;
  village: string | null;
  city: string | null;
  add_phone_number_1: string | null;
  add_phone_number_2: string | null;
  add_phone_number_3: string | null;
  add_phone_number_4: string | null;
  add_phone_number_5: string | null;
  add_phone_number_6: string | null;
  add_phone_number_7: string | null;
  add_phone_number_8: string | null;
  add_phone_number_9: string | null;
  add_phone_number_10: string | null;
  service_type: "esim_purchase" | "sim_swap" | "new_physical_sim" | "kyc_compliance" | "smega_registration" | null;
  status: "pending" | "verified" | "rejected" | "expired";
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  expired: number;
  omang: number;
  passport: number;
  esimPurchase: number;
  simSwap: number;
  newPhysicalSim: number;
  kycCompliance: number;
  smegaRegistration: number;
  todayCount: number;
}

const normalizeStats = (rawStats: any): Stats => ({
  total: Number(rawStats?.total ?? rawStats?.total_requests ?? 0),
  pending: Number(rawStats?.pending ?? rawStats?.pending_kyc ?? 0),
  verified: Number(rawStats?.verified ?? rawStats?.completed_requests ?? 0),
  rejected: Number(rawStats?.rejected ?? 0),
  expired: Number(rawStats?.expired ?? 0),
  omang: Number(rawStats?.omang ?? 0),
  passport: Number(rawStats?.passport ?? 0),
  esimPurchase: Number(rawStats?.esimPurchase ?? 0),
  simSwap: Number(rawStats?.simSwap ?? 0),
  newPhysicalSim: Number(rawStats?.newPhysicalSim ?? 0),
  kycCompliance: Number(rawStats?.kycCompliance ?? 0),
  smegaRegistration: Number(rawStats?.smegaRegistration ?? 0),
  todayCount: Number(rawStats?.todayCount ?? 0),
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, isAdminLoading, signOut } = useAuth();
  
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; recordId: string; recordName: string } | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [documentViewDialog, setDocumentViewDialog] = useState<{
    open: boolean;
    recordId: string;
    recordName: string;
    documents: Array<{ type: string; label: string; url: string }>;
  } | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploadingSubscribers, setIsUploadingSubscribers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Only show error if both auth loading AND admin loading are complete
    if (!authLoading && !isAdminLoading && user && !isAdmin) {
      toast.error("Access denied. Admin role required.");
      navigate("/admin");
    }
  }, [isAdmin, authLoading, isAdminLoading, user, navigate]);

  const fetchStats = async () => {
    try {
      const data = await api.adminDashboard();
      // Prefer detailed dashboard stats; fallback to legacy stats keys.
      const nextStats =
        data?.dashboard?.stats ||
        data?.data?.dashboard?.stats ||
        data?.data?.stats ||
        data?.stats;
      if (nextStats) {
        setStats(normalizeStats(nextStats));
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    
    try {
      const data = await api.adminDashboard();
      const rawRecords =
        data?.records ||
        data?.kyc_records ||
        data?.data?.records ||
        data?.data?.kyc_records ||
        [];
      const allRecords: KYCRecord[] = Array.isArray(rawRecords) ? rawRecords : [];

      const filtered = allRecords.filter((record) => {
        if (statusFilter !== "all" && record.status !== statusFilter) return false;
        if (documentTypeFilter !== "all" && record.document_type !== documentTypeFilter) return false;
        if (serviceTypeFilter !== "all" && record.service_type !== serviceTypeFilter) return false;
        if (search) {
          const haystack = [
            record.msisdn,
            record.full_name,
            record.first_name,
            record.surname,
            record.document_number,
            record.email,
            record.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      });

      const limit = 10;
      const totalCount = filtered.length;
      const totalPagesCount = Math.max(1, Math.ceil(totalCount / limit));
      const startIndex = (page - 1) * limit;
      const pageRecords = filtered.slice(startIndex, startIndex + limit);

      setRecords(pageRecords);
      setTotalPages(totalPagesCount);
      setTotal(totalCount);
    } catch (err) {
      console.error("Error fetching records:", err);
      toast.error("Failed to fetch records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
      fetchRecords();
    }
  }, [user, isAdmin, page, statusFilter, documentTypeFilter, serviceTypeFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchRecords();
  };

  const handleRefresh = () => {
    fetchStats();
    fetchRecords();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/admin");
  };

  const handleViewDocuments = async (recordId: string, recordName: string) => {
    setIsLoadingDocuments(true);
    setDocumentViewDialog({
      open: true,
      recordId,
      recordName,
      documents: []
    });

    try {
      const data = await api.adminDashboard();
      const rawRecords =
        data?.records ||
        data?.kyc_records ||
        data?.data?.records ||
        data?.data?.kyc_records ||
        [];
      const allRecords: KYCRecord[] = Array.isArray(rawRecords) ? rawRecords : [];
      const target = allRecords.find((record) => String(record.id) === String(recordId));

      const selfieUrl =
        (typeof target?.selfie_url === "string" && target.selfie_url) ||
        (typeof target?.metadata?.selfie_url === "string" && target.metadata.selfie_url) ||
        (typeof target?.metadata?.selfieUrl === "string" && target.metadata.selfieUrl) ||
        "";
      const documentPhotoUrls = [
        ...(Array.isArray(target?.document_photo_urls) ? target.document_photo_urls : []),
        ...(Array.isArray(target?.metadata?.document_photo_urls) ? target.metadata.document_photo_urls : []),
        ...(Array.isArray(target?.metadata?.documentPhotoUrls) ? target.metadata.documentPhotoUrls : []),
      ].filter((url): url is string => typeof url === "string" && url.length > 0);

      const metadataDocs = Array.isArray(target?.metadata?.documents) ? target?.metadata?.documents : [];
      const metadataPhotos = Array.isArray(target?.metadata?.documentPhotos) ? target?.metadata?.documentPhotos : [];
      const dbPhotos = Array.isArray(target?.document_photos) ? target?.document_photos : [];
      const allPhotoSources = [...dbPhotos, ...metadataDocs, ...metadataPhotos];

      const structuredDocuments = allPhotoSources
        .map((item: any, index: number) => {
          const url = item?.url || item?.signedUrl || item?.publicUrl || item?.imageUrl || item?.path;
          if (!url || typeof url !== "string") return null;
          return {
            type: item?.type || `document_${index + 1}`,
            label: item?.label || `Document ${index + 1}`,
            url,
          };
        })
        .filter(Boolean) as Array<{ type: string; label: string; url: string }>;

      const directDocuments = documentPhotoUrls.map((url, index) => ({
        type: `document_photo_${index + 1}`,
        label: `Document ${index + 1}`,
        url,
      }));

      const selfieDocument = selfieUrl
        ? [{ type: "selfie", label: "Selfie", url: selfieUrl }]
        : [];

      const mergedDocuments = [...selfieDocument, ...directDocuments, ...structuredDocuments];
      const seenUrls = new Set<string>();
      const documents = mergedDocuments.filter((doc) => {
        if (!doc?.url || seenUrls.has(doc.url)) return false;
        seenUrls.add(doc.url);
        return true;
      });

      setDocumentViewDialog({
        open: true,
        recordId,
        recordName,
        documents,
      });
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Failed to fetch documents");
      setDocumentViewDialog(null);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const data = await api.adminDashboard();
      const rawRecords =
        data?.records ||
        data?.kyc_records ||
        data?.data?.records ||
        data?.data?.kyc_records ||
        [];
      const allRecords: KYCRecord[] = Array.isArray(rawRecords) ? rawRecords : [];

      const exportRecords = allRecords.filter((record) => {
        if (statusFilter !== "all" && record.status !== statusFilter) return false;
        if (documentTypeFilter !== "all" && record.document_type !== documentTypeFilter) return false;
        if (serviceTypeFilter !== "all" && record.service_type !== serviceTypeFilter) return false;
        if (search) {
          const haystack = [
            record.msisdn,
            record.full_name,
            record.first_name,
            record.surname,
            record.document_number,
            record.email,
            record.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      });

      const getRecordMsisdn = (record: KYCRecord): string | null => {
        return (
          record.msisdn ||
          record.metadata?.msisdn ||
          record.metadata?.selectedNumber ||
          record.metadata?.phoneNumber ||
          null
        );
      };
      
      // Helper to format service type for display
      const formatServiceType = (serviceType: string | null): string => {
        const serviceLabels: Record<string, string> = {
          esim_purchase: "Buy eSIM",
          kyc_compliance: "KYC Compliance",
          new_physical_sim: "New Physical SIM",
          sim_swap: "SIM Swap",
          smega_registration: "SMEGA Registration"
        };
        return serviceLabels[serviceType || ""] || serviceType || "";
      };

      // Create CSV content with all table columns
      const headers = [
        "ID", "MSISDN", "Full Name", "First Name", "Surname", "Date of Birth", "Sex",
        "Country", "Country Abbr", "Document Type", "Document Number", "Date of Issue", "Expiry Date",
        "Physical Address", "Postal Address", "Service Type", "Status",
        "Phone 1", "Phone 2", "Phone 3", "Phone 4", "Phone 5", 
        "Phone 6", "Phone 7", "Phone 8", "Phone 9", "Phone 10",
        "Created At", "Updated At"
      ];

      const csvRows = [headers.join(",")];
      
      for (const record of exportRecords) {
        const escapeCSV = (value: string | null | undefined): string => {
          if (!value) return "";
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = value.replace(/"/g, '""');
          if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
            return `"${escaped}"`;
          }
          return escaped;
        };

        const row = [
          record.id,
          escapeCSV(formatMsisdn(getRecordMsisdn(record))),
          escapeCSV(record.full_name),
          escapeCSV(record.first_name),
          escapeCSV(record.surname),
          record.date_of_birth || "",
          escapeCSV(record.sex),
          escapeCSV(record.country),
          escapeCSV(record.country_abbreviation),
          record.document_type,
          escapeCSV(record.document_number),
          record.date_of_issue || "",
          record.expiry_date || "",
          escapeCSV(record.physical_address),
          escapeCSV(record.postal_address),
          formatServiceType(record.service_type),
          record.status,
          escapeCSV(record.add_phone_number_1),
          escapeCSV(record.add_phone_number_2),
          escapeCSV(record.add_phone_number_3),
          escapeCSV(record.add_phone_number_4),
          escapeCSV(record.add_phone_number_5),
          escapeCSV(record.add_phone_number_6),
          escapeCSV(record.add_phone_number_7),
          escapeCSV(record.add_phone_number_8),
          escapeCSV(record.add_phone_number_9),
          escapeCSV(record.add_phone_number_10),
          record.created_at,
          record.updated_at
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `kyc_records_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
      link.click();
      
      toast.success(`Exported ${exportRecords.length} records`);
    } catch (err) {
      console.error("Error exporting:", err);
      toast.error("Failed to export records");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllTables = async () => {
    setIsExportingAll(true);
    try {
      toast.error("Bulk export is not available in the current API.");
    } catch (err) {
      console.error("Error exporting all tables:", err);
      toast.error("Failed to export tables");
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleSubscriberUpload = async (file: File) => {
    setIsUploadingSubscribers(true);
    
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      // Parse CSV: extract phone numbers, remove duplicates, trim whitespace
      const phoneNumbers = [...new Set(
        lines
          .map(line => line.trim().replace(/[",]/g, ''))
          .filter(line => line && /^\d+$/.test(line))
      )];

      if (phoneNumbers.length === 0) {
        toast.error("No valid phone numbers found in file");
        setIsUploadingSubscribers(false);
        return;
      }

      // Call subscriber-upload endpoint
      const data = await api.subscriberUpload(phoneNumbers);
      toast.success(`Uploaded ${data.inserted ?? phoneNumbers.length} subscribers (Total: ${phoneNumbers.length})`);
      setUploadDialogOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error uploading subscribers:', err);
      toast.error("Failed to process file");
    } finally {
      setIsUploadingSubscribers(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteDialog) return;
    
    setIsDeleting(true);
    try {
      toast.error("Record deletion is not available in the current API.");
    } catch (err) {
      console.error("Error deleting record:", err);
      toast.error("Failed to delete record");
    } finally {
      setIsDeleting(false);
      setDeleteDialog(null);
    }
  };

  const handleBulkDeleteRecords = async () => {
    if (selectedRecords.size === 0) return;
    
    setIsDeleting(true);
    try {
      toast.error("Bulk deletion is not available in the current API.");
    } catch (err) {
      console.error("Error deleting records:", err);
      toast.error("Failed to delete records");
    } finally {
      setIsDeleting(false);
      setBulkDeleteDialog(false);
    }
  };

  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  const isAllSelected = records.length > 0 && selectedRecords.size === records.length;
  const isSomeSelected = selectedRecords.size > 0 && selectedRecords.size < records.length;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, variant: "secondary" as const, label: "Pending" },
      verified: { icon: CheckCircle2, variant: "default" as const, label: "Verified" },
      rejected: { icon: XCircle, variant: "destructive" as const, label: "Rejected" },
      expired: { icon: AlertCircle, variant: "outline" as const, label: "Expired" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getServiceTypeBadge = (serviceType: string | null) => {
    const serviceConfig = {
      esim_purchase: { icon: Smartphone, className: "bg-blue-100 text-blue-800 border-blue-200", label: "Buy eSIM" },
      kyc_compliance: { icon: UserCog, className: "bg-amber-100 text-amber-800 border-amber-200", label: "KYC Compliance" },
      new_physical_sim: { icon: CreditCard, className: "bg-green-100 text-green-800 border-green-200", label: "New Physical SIM" },
      sim_swap: { icon: ArrowLeftRight, className: "bg-purple-100 text-purple-800 border-purple-200", label: "SIM Swap" },
      smega_registration: { icon: UserPlus, className: "bg-teal-100 text-teal-800 border-teal-200", label: "SMEGA Registration" }
    };

    const config = serviceConfig[serviceType as keyof typeof serviceConfig] || serviceConfig.esim_purchase;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">KYC Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage verification records</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/payments")}>
              <Banknote className="w-4 h-4 mr-2" />
              Payments
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>
              <UserCog className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Subscribers
            </Button>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Verifications</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-3xl font-bold text-success">{stats?.verified || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-warning">{stats?.pending || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-3xl font-bold text-foreground">{stats?.todayCount || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by verification ID, identity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="omang">Omang</SelectItem>
                <SelectItem value="passport">Passport</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="esim_purchase">Buy eSIM</SelectItem>
                <SelectItem value="kyc_compliance">KYC Compliance</SelectItem>
                <SelectItem value="new_physical_sim">New Physical SIM</SelectItem>
                <SelectItem value="sim_swap">SIM Swap</SelectItem>
                <SelectItem value="smega_registration">SMEGA Registration</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export KYC"}
            </Button>
            <Button variant="outline" onClick={handleExportAllTables} disabled={isExportingAll}>
              <Download className="w-4 h-4 mr-2" />
              {isExportingAll ? "Exporting..." : "Export All Tables"}
            </Button>
            {isSuperAdmin && (
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedRecords(new Set(records.map(r => r.id)));
                  } else if (value === "none") {
                    setSelectedRecords(new Set());
                  } else {
                    const filteredRecords = records.filter(r => r.status === value);
                    setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>Select by Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select All</SelectItem>
                  <SelectItem value="none">Clear Selection</SelectItem>
                  <SelectItem value="pending">All Pending</SelectItem>
                  <SelectItem value="verified">All Verified</SelectItem>
                  <SelectItem value="rejected">All Rejected</SelectItem>
                  <SelectItem value="expired">All Expired</SelectItem>
                </SelectContent>
              </Select>
            )}
            {isSuperAdmin && selectedRecords.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setBulkDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedRecords.size})
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isSuperAdmin && (
                  <TableHead className="whitespace-nowrap w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                )}
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="whitespace-nowrap">Service Type</TableHead>
                <TableHead className="whitespace-nowrap">MSISDN</TableHead>
                <TableHead className="whitespace-nowrap">Country</TableHead>
                <TableHead className="whitespace-nowrap">Country Abbr.</TableHead>
                <TableHead className="whitespace-nowrap">Full Name</TableHead>
                <TableHead className="whitespace-nowrap">First Name</TableHead>
                <TableHead className="whitespace-nowrap">Surname</TableHead>
                <TableHead className="whitespace-nowrap">Date of Birth</TableHead>
                <TableHead className="whitespace-nowrap">Sex</TableHead>
                <TableHead className="whitespace-nowrap">Document Type</TableHead>
                <TableHead className="whitespace-nowrap">Document Number</TableHead>
                <TableHead className="whitespace-nowrap">Physical Address</TableHead>
                <TableHead className="whitespace-nowrap">Postal Address</TableHead>
                <TableHead className="whitespace-nowrap">Date of Issue</TableHead>
                <TableHead className="whitespace-nowrap">Expiry Date</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Next of Kin Name</TableHead>
                <TableHead className="whitespace-nowrap">Next of Kin Relation</TableHead>
                <TableHead className="whitespace-nowrap">Next of Kin Phone</TableHead>
                <TableHead className="whitespace-nowrap">Plot Number</TableHead>
                <TableHead className="whitespace-nowrap">Ward</TableHead>
                <TableHead className="whitespace-nowrap">Village</TableHead>
                <TableHead className="whitespace-nowrap">City</TableHead>
                <TableHead className="whitespace-nowrap">Phone 1</TableHead>
                <TableHead className="whitespace-nowrap">Phone 2</TableHead>
                <TableHead className="whitespace-nowrap">Phone 3</TableHead>
                <TableHead className="whitespace-nowrap">Phone 4</TableHead>
                <TableHead className="whitespace-nowrap">Phone 5</TableHead>
                <TableHead className="whitespace-nowrap">Phone 6</TableHead>
                <TableHead className="whitespace-nowrap">Phone 7</TableHead>
                <TableHead className="whitespace-nowrap">Phone 8</TableHead>
                <TableHead className="whitespace-nowrap">Phone 9</TableHead>
                <TableHead className="whitespace-nowrap">Phone 10</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Created At</TableHead>
                <TableHead className="whitespace-nowrap">Updated At</TableHead>
                <TableHead className="whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={39} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={39} className="text-center py-8 text-muted-foreground">
                    No verification records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className={selectedRecords.has(record.id) ? "bg-muted/50" : ""}>
                    {isSuperAdmin && (
                      <TableCell className="whitespace-nowrap">
                        <Checkbox
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={() => toggleSelectRecord(record.id)}
                          aria-label={`Select ${record.full_name || record.id}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {record.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getServiceTypeBadge(record.service_type)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatMsisdn(record.msisdn || record.metadata?.msisdn || record.metadata?.selectedNumber || record.metadata?.phoneNumber)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{record.country || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.country_abbreviation || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.full_name || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.first_name || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.surname || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {record.date_of_birth ? format(new Date(record.date_of_birth), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{record.sex || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{record.document_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{record.document_number || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={record.physical_address || ""}>
                      {record.physical_address || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={record.postal_address || ""}>
                      {record.postal_address || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {record.date_of_issue ? format(new Date(record.date_of_issue), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {record.expiry_date ? format(new Date(record.expiry_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{record.email || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.next_of_kin_name || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.next_of_kin_relation || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.next_of_kin_phone || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.plot_number || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.ward || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.village || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.city || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_1 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_2 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_3 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_4 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_5 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_6 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_7 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_8 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_9 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.add_phone_number_10 || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.updated_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => handleViewDocuments(
                            record.id,
                            record.full_name || record.document_number || record.id
                          )}
                          title="View ID/Passport"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({
                              open: true,
                              recordId: record.id,
                              recordName: record.full_name || record.document_number || record.id
                            })}
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {records.length} of {total} records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for "{deleteDialog?.recordName}"? 
              The record will be hidden from view but preserved in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRecords.size} selected records? 
              The records will be hidden from view but preserved in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeleteRecords}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedRecords.size} Records`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog 
        open={documentViewDialog?.open ?? false} 
        onOpenChange={(open) => !open && setDocumentViewDialog(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              ID Documents - {documentViewDialog?.recordName}
            </DialogTitle>
            <DialogDescription>
              View the uploaded identity documents for this verification record.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading documents...</span>
            </div>
          ) : documentViewDialog?.documents && documentViewDialog.documents.length > 0 ? (
            <div className="grid gap-6">
              {documentViewDialog.documents.map((doc, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">{doc.label}</h4>
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/50">
                    <img
                      src={doc.url}
                      alt={doc.label}
                      className="w-full h-auto max-h-[500px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f1f5f9" width="400" height="300"/><text fill="%2394a3b8" font-family="sans-serif" font-size="16" x="50%" y="50%" text-anchor="middle" dy=".3em">Image not available</text></svg>';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileImage className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No document images available for this record.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This could mean the verification hasn't been completed or images are no longer accessible.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SubscriberUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen} 
      />
    </div>
  );
};

export default AdminDashboard;
