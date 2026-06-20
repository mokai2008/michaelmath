"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, User, Wallet, Plus, CheckCircle2, DollarSign } from "lucide-react";

export default function AdminWalletPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isCrediting, setIsCrediting] = useState(false);
  const [recentCredits, setRecentCredits] = useState<any[]>([]);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, wallet_balance, student_code')
      .eq('role', 'student')
      .order('full_name');
    setStudents(data || []);
    setIsLoading(false);
  };

  const handleCredit = async () => {
    if (!selectedStudent || !amount || parseFloat(amount) <= 0) {
      alert("Select a student and enter a valid amount.");
      return;
    }
    setIsCrediting(true);
    try {
      const creditAmount = parseFloat(amount);
      const newBalance = (selectedStudent.wallet_balance || 0) + creditAmount;

      // 1. Update wallet balance directly
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedStudent.id);

      if (updateErr) throw new Error('Failed to update balance: ' + updateErr.message);

      // 2. Record transaction
      const { error: txErr } = await supabase.from('wallet_transactions').insert({
        student_id: selectedStudent.id,
        type: 'topup',
        amount: creditAmount,
        description: description || 'Manual top-up by admin',
      });
      if (txErr) console.error('Transaction record error:', txErr);

      // 3. Notify student
      await supabase.from('notifications').insert({
        student_id: selectedStudent.id,
        title: 'Wallet Credited!',
        message: `$${creditAmount.toFixed(2)} has been added to your wallet. New balance: $${newBalance.toFixed(2)}`,
        type: 'system',
      });

      setRecentCredits(prev => [{
        studentName: selectedStudent.full_name,
        amount: creditAmount,
        newBalance,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 10));

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === selectedStudent.id ? { ...s, wallet_balance: newBalance } : s
      ));
      setSelectedStudent({ ...selectedStudent, wallet_balance: newBalance });

      alert(`$${creditAmount.toFixed(2)} credited to ${selectedStudent.full_name}. New balance: $${newBalance.toFixed(2)}`);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsCrediting(false);
    }
  };

  const filtered = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Wallet Management</h1>
        <p className="text-text/60 text-sm">Search students by name, email, or code and manually add funds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <input type="text" placeholder="Search by name, email, or code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <div className="max-h-[65vh] overflow-y-auto space-y-2 pr-1">
            {filtered.map(student => (
              <div key={student.id} onClick={() => setSelectedStudent(student)}
                className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-text truncate">{student.full_name || 'Unnamed'}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text/40">{student.email}</span>
                      {student.student_code && <span className="text-[9px] font-bold bg-gray-100 text-text/60 px-1.5 py-0.5 rounded">{student.student_code}</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary">${(student.wallet_balance || 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-text/50 text-sm py-8">No students found.</p>}
          </div>
        </div>

        {/* Credit Panel */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedStudent.avatar_url ? <img src={selectedStudent.avatar_url} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-text">{selectedStudent.full_name || 'Unnamed'}</h3>
                    <p className="text-sm text-text/50">{selectedStudent.email}</p>
                    {selectedStudent.student_code && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded mt-1 inline-block">{selectedStudent.student_code}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text/40 uppercase font-bold">Current Balance</div>
                    <div className="text-3xl font-black text-primary">${(selectedStudent.wallet_balance || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text/50 uppercase tracking-wider mb-2">Amount to Add ($)</label>
                  <div className="flex gap-2 mb-3">
                    {[5, 10, 20, 50, 100].map(amt => (
                      <button key={amt} onClick={() => setAmount(amt.toString())}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${amount === amt.toString() ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-text/60 hover:border-gray-300'}`}
                      >${amt}</button>
                    ))}
                  </div>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Custom amount"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-primary text-center" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text/50 uppercase tracking-wider mb-2">Note (optional)</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Payment received in cash"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>

                <button onClick={handleCredit} disabled={isCrediting || !amount || parseFloat(amount) <= 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 shadow-sm">
                  {isCrediting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isCrediting ? 'Crediting...' : `Add $${parseFloat(amount || '0').toFixed(2)} to Wallet`}
                </button>
              </div>

              {/* Recent Credits Log */}
              {recentCredits.length > 0 && (
                <div className="p-6 border-t border-gray-100">
                  <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-3">Session Activity</h4>
                  <div className="space-y-2">
                    {recentCredits.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-text/80 flex-1"><strong>{c.studentName}</strong> → +${c.amount.toFixed(2)} (Balance: ${c.newBalance.toFixed(2)})</span>
                        <span className="text-[10px] text-text/40">{c.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-text/40 min-h-[400px]">
              <Wallet className="w-12 h-12 mb-4" />
              <p className="font-medium">Select a student to manage their wallet</p>
              <p className="text-sm mt-1">Search by name, email, or student code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
