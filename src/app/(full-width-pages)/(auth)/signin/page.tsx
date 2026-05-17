import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Verri P Water Inc",
  description: "Sign in to Verri P Water Operations Dashboard",
};

export default function SignIn() {
  return <SignInForm />;
}
