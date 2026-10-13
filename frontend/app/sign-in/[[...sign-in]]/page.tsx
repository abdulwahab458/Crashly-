import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
    return(
        <div className=""> 

        <Suspense fallback={<div>Loading sign in...</div>}>
            <SignIn />
        </Suspense>
        </div>
    )
}