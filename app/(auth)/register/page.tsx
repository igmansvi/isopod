/**
 * @file Registration page.
 * @description Renders the registration form and sets page metadata.
 */

import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register — Isopod",
  description: "Create a new Isopod account",
};

/**
 * @description Server component that renders the client-side
 * RegisterForm within the auth layout.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
