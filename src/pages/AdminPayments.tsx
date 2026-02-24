import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote, 
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PaymentTransaction {
  id: string;
  msisdn: string | null;
  payment_method: string;
  payment_type: string | null;
  amount: number;
  currency: string;
  status: string;
  voucher_code: string | null;
  customer_care_user_id: string | null;
  service_type: string | null;
  plan_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

interface PaymentStats {
  total_transactions: number;
  total_revenue: number;
  by_method: Record<string, { count: number; revenue: number }>;
  by_service: Record<string, { count: number; revenue: number }>;
  by_status: Record<string, number>;
}

const AdminPayments = () => {
  const navigate = useNavigate();
  const { session, isAdmin, isAdminLoading } = useAuth();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, isAdminLoading, navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (methodFilter !== 'all') params.payment_method = methodFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (serviceFilter !== 'all') params.service_type = serviceFilter;

      const data = await api.adminPayments(params);
      const rawList = data?.transactions || data?.data || data || [];
      const transactionsList = Array.isArray(rawList) ? rawList : [];
      setTransactions(transactionsList);
      setTotal(data?.total || transactionsList.length || 0);

      if (Array.isArray(transactionsList)) {
        const byMethod: PaymentStats["by_method"] = {};
        const byService: PaymentStats["by_service"] = {};
        const byStatus: PaymentStats["by_status"] = {};
        let totalRevenue = 0;

        transactionsList.forEach((tx: PaymentTransaction) => {
          totalRevenue += Number(tx.amount || 0);
          byMethod[tx.payment_method] = byMethod[tx.payment_method] || { count: 0, revenue: 0 };
          byMethod[tx.payment_method].count += 1;
          byMethod[tx.payment_method].revenue += Number(tx.amount || 0);

          const serviceKey = tx.service_type || "unknown";
          byService[serviceKey] = byService[serviceKey] || { count: 0, revenue: 0 };
          byService[serviceKey].count += 1;
          byService[serviceKey].revenue += Number(tx.amount || 0);

          const statusKey = tx.status || "unknown";
          byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
        });

        setStats({
          total_transactions: transactionsList.length,
          total_revenue: totalRevenue,
          by_method: byMethod,
          by_service: byService,
          by_status: byStatus,
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Stats are derived from the transactions list for now.
    return;
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();
    }
  }, [session?.access_token, isAdmin, methodFilter, statusFilter, serviceFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMethodBadge = (method: string) => {
    if (method.includes('card')) {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600"><CreditCard className="w-3 h-3 mr-1" />Card</Badge>;
    }
    if (method.includes('cash_assisted')) {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600"><Banknote className="w-3 h-3 mr-1" />Cash (Assisted)</Badge>;
    }
    if (method.includes('cash_non_assisted')) {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600"><Banknote className="w-3 h-3 mr-1" />Cash (Self)</Badge>;
    }
    return <Badge variant="outline">{method}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Transactions</h1>
              <p className="text-muted-foreground">View and audit all payment activities</p>
            </div>
          </div>
          <Button onClick={() => { fetchTransactions(); fetchStats(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-foreground">P{stats.total_revenue.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-xl font-bold text-foreground">{stats.total_transactions}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Card Payments</p>
                  <p className="text-xl font-bold text-foreground">
                    {stats.by_method['card']?.count || 0}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash Payments</p>
                  <p className="text-xl font-bold text-foreground">
                    {(stats.by_method['cash_assisted']?.count || 0) + (stats.by_method['cash_non_assisted']?.count || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash_assisted">Cash (Assisted)</SelectItem>
                <SelectItem value="cash_non_assisted">Cash (Self)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="esim_purchase">eSIM Purchase</SelectItem>
                <SelectItem value="sim_swap">SIM Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>CC User ID</TableHead>
                <TableHead>MSISDN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.created_at)}</TableCell>
                    <TableCell>{getMethodBadge(tx.payment_method)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.service_type?.replace('_', ' ') || '-'}
                    </TableCell>
                    <TableCell className="font-medium">P{tx.amount}</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.voucher_code || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.customer_care_user_id || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.msisdn || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {transactions.length} of {total} transactions
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
