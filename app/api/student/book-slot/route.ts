import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { slot_id, booking_date, notes, student_id } = await req.json();

    if (!slot_id || !booking_date || !student_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: booking, error: rpcError } = await supabaseAuth.rpc('book_availability_slot', {
      p_slot_id: slot_id,
      p_student_id: student_id,
      p_booking_date: booking_date,
      p_notes: notes || null
    });

    if (rpcError) {
      console.error("Booking RPC error:", rpcError);
      return NextResponse.json({ error: rpcError.message || "Failed to create booking request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking });

  } catch (error: any) {
    console.error("Booking slot error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
