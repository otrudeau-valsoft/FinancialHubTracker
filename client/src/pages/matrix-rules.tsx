import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function MatrixRulesPage() {
  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md mb-6">
          <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
            <div className="w-full flex items-center justify-between">
              <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">MATRIX RULE ENGINE</h3>
              <div className="h-1 w-8 bg-[#FFD700]"></div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-2xl font-semibold text-center mb-4">Currently Deploying Matrix Rule Engine</h2>
            <p className="text-gray-400 text-center max-w-lg">
              The Matrix Rule Engine is currently being deployed and will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
