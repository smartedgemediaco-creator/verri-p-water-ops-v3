import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Verri P Water Inc",
  description: "Create an account for Verri P Water Operations Dashboard",
};

export default function SignUp() {
  return <SignUpForm />;
}
