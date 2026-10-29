"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiRequest } from "@/utils/api";
import type { DashboardTrends, TrendBucket } from "@/utils/types";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";
import { RotateCw, AlertCircle, BarChart3, TrendingUp } from "lucide-react";

interface OverviewTrendsChartProps {
    projectId: string;
}

export function OverviewTrendsChart({ projectId }: OverviewTrendsChartProps) {
    const { getToken } = useAuth();
    const [range, setRange] = useState<"24h" | "7d">("24h");
    const [trends, setTrends] = useState<DashboardTrends | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrends = useCallback(async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            const data = await apiRequest<DashboardTrends>(
                `/dashboard/trends?range=${range}&projectId=${projectId}`,
                token
            );
            setTrends(data);
        } catch (err: any) {
            console.error("Failed to fetch trends:", err);
            setError(err.message || "Failed to load error trends");
        } finally {
            setIsLoading(false);
        }
    }, [projectId, range, getToken]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    const formatTimeLabel = (isoString: string) => {
        const date = new Date(isoString);
        if (range === "24h") {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const totalInRange = trends?.data.reduce((acc, curr) => acc + curr.count, 0) ?? 0;

    return (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xs">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-base font-semibold text-zinc-100">
                            Error Volume Over Time
                        </h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                        {range === "24h"
                            ? "Hourly aggregation across the last 24 hours"
                            : "Daily aggregation across the last 7 days"}
                        {trends && (
                            <span className="ml-2 font-mono text-zinc-300 font-medium">
                                ({totalInRange.toLocaleString()} total events)
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                        <button
                            onClick={() => setRange("24h")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                range === "24h"
                                    ? "bg-zinc-800 text-emerald-400 font-semibold shadow-xs"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            24 Hours
                        </button>
                        <button
                            onClick={() => setRange("7d")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                range === "7d"
                                    ? "bg-zinc-800 text-emerald-400 font-semibold shadow-xs"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            7 Days
                        </button>
                    </div>

                    <button
                        onClick={fetchTrends}
                        disabled={isLoading}
                        title="Refresh trends"
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 transition-colors disabled:opacity-50"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Chart Area */}
            {isLoading ? (
                <div className="h-64 w-full flex flex-col items-center justify-center bg-zinc-950/40 rounded-lg border border-zinc-800/60 animate-pulse">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
                    <span className="text-xs text-zinc-500">Loading trend metrics...</span>
                </div>
            ) : error ? (
                <div className="h-64 w-full flex flex-col items-center justify-center bg-zinc-950/40 rounded-lg border border-zinc-800/60 p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                    <p className="text-sm font-medium text-zinc-200 mb-1">Failed to load trend data</p>
                    <p className="text-xs text-zinc-500 max-w-sm mb-4">{error}</p>
                    <button
                        onClick={fetchTrends}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 rounded-lg transition-colors border border-zinc-700"
                    >
                        Retry
                    </button>
                </div>
            ) : !trends || trends.data.length === 0 || totalInRange === 0 ? (
                <div className="h-64 w-full flex flex-col items-center justify-center bg-zinc-950/40 rounded-lg border border-zinc-800/60 p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 mb-2">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">No events captured in this time window</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                        Trigger an error using the Crashly SDK to see real-time volume buckets.
                    </p>
                </div>
            ) : (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={trends.data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="errorVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTimeLabel}
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#27272a" }}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const item = payload[0].payload as TrendBucket;
                                        return (
                                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 shadow-xl text-xs">
                                                <div className="text-zinc-400 font-mono mb-1">
                                                    {new Date(item.timestamp).toLocaleString([], {
                                                        dateStyle: "medium",
                                                        timeStyle: "short"
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    <span className="text-zinc-200">
                                                        {item.count.toLocaleString()} {item.count === 1 ? "error event" : "error events"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#errorVolumeGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
