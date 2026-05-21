"use client";

import { useState, useEffect } from "react";
import SignInForm from "@/components/auth/SignInForm";
import BrandedSplash from "@/components/common/BrandedSplash";

export default function SignIn() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return <BrandedSplash />;

  return <SignInForm />;
}
