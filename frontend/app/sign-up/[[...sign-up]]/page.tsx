import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <Suspense fallback={<div>Loading sign up...</div>}>
            <SignUp />
        </Suspense>
    );
}