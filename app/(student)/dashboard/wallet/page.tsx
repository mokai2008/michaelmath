"use client";

import { useState, useEffect, Suspense } from "react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function WalletContent() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('topup') === 'success') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', session.user.id)
      .single();
    setBalance(profile?.wallet_balance || 0);

    // Fetch transactions
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false });
    setTransactions(txns || []);
    setIsLoading(false);
  };

  const handleTopUp = async (amount: number) => {
    if (amount < 1) { alert("Minimum top-up is $1"); return; }
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">My Wallet</h1>
        <p className="text-text/60 text-sm">Manage your funds and purchase history.</p>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Payment successful! Your wallet has been topped up.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
        {/* Balance Card */}
        <div className="md:col-span-2 bg-text text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl shadow-text/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-8">
              <WalletIcon className="w-6 h-6 text-primary" />
              <span className="font-medium text-white/80">Available Balance</span>
            </div>
            <div>
              <div className="text-sm font-medium text-white/60 mb-1">USD</div>
              <div className="text-5xl font-bold tracking-tight">${balance.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Top Up Card */}
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-text mb-2 text-center">Top Up Wallet</h3>
          <p className="text-text/60 text-xs mb-4 text-center">Add funds via Stripe</p>

          <div className="flex gap-2 mb-3">
            {[5, 10, 20, 50].map(amt => (
              <button key={amt} onClick={() => setTopupAmount(amt.toString())}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${topupAmount === amt.toString() ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-text/60 hover:border-gray-300'}`}
              >${amt}</button>
            ))}
          </div>
          <input type="number" placeholder="Custom amount" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary mb-3 text-center font-bold" />
          <button
            onClick={() => handleTopUp(parseFloat(topupAmount) || 0)}
            disabled={isProcessing || !topupAmount}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isProcessing ? 'Redirecting...' : 'Add Funds'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-text">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text/60 font-medium">No transactions yet.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'topup' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {tx.type === 'topup' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-text">{tx.description}</div>
                    <div className="text-xs text-text/50">{new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div className={`font-bold text-lg ${tx.type === 'topup' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'topup' ? '+' : '-'}${tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>}>
      <WalletContent />
    </Suspense>
  );
}
