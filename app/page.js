"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RevenueDashboard from "@/components/RevenueDashboard";
import DebtDashboard from "@/components/DebtDashboard";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("revenue");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
            🏢 ICampus Dashboard
          </h1>
          
          {/* Tabs */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab("revenue")}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === "revenue" ? '600' : '400',
                backgroundColor: activeTab === "revenue" ? '#3b82f6' : 'transparent',
                color: activeTab === "revenue" ? 'white' : '#4b5563',
              }}
            >
              💰 Revenue
            </button>
            <button
              onClick={() => setActiveTab("debt")}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === "debt" ? '600' : '400',
                backgroundColor: activeTab === "debt" ? '#3b82f6' : 'transparent',
                color: activeTab === "debt" ? 'white' : '#4b5563',
              }}
            >
              💳 Debt
            </button>
          </nav>
        </div>

        {/* User menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {session.user?.email}
          </span>
          <button
            onClick={() => signOut()}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Dashboard content */}
      <main>
        {activeTab === "revenue" && <RevenueDashboard />}
        {activeTab === "debt" && <DebtDashboard />}
      </main>
    </div>
  );
}
