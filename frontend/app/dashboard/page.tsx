"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function DashboardTestPage() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [result, setResult] = useState("");

    const testBackend = async () => {
        const token = await getToken();
        console.log("Token:", token);

        if (!token) {
            setResult("Please sign in first.");
            return;
        }

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/dashboard/me`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        setResult(JSON.stringify(data, null, 2));
    };

    if (!isLoaded) {
        return <p>Loading authentication...</p>;
    }

    if (!isSignedIn) {
        return <p>Please sign in at /sign-in first.</p>;
    }

    return (
        <main>
            <h1>Dashboard Authentication Test</h1>
            <button onClick={testBackend} className="bg-blue-500 text-white px-4 py-2 rounded">
                Test Backend Authentication
            </button>
            <pre>{result}</pre>
            <div className="bg-red-500 text-white px-4 py-2 rounded mt-4">

            <SignOutButton >
                Sign Out
            </SignOutButton>
            </div>
        </main>
    );
}