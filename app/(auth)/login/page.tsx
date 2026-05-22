/**
 * @file Login page.
 * @description Renders the login form and sets page metadata.
 */

import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Isopod",
  description: "Sign in to your Isopod account",
};

/**
 * @description Server component that renders the client-side
 * LoginForm within the auth layout.
 */
export default function LoginPage() {
  return <LoginForm />;
}
