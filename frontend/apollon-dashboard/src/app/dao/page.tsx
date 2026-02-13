"use client";

import Navbar from "@/components/Navbar";
import DaoForum from "@/components/DaoForum";

export default function DaoPage() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <DaoForum />
      </div>
    </div>
  );
}
