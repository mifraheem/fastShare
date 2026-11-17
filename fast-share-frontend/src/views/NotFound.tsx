"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <main className="flex min-h-dvh items-center justify-center p-6">
    <div className="max-w-sm text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">There&apos;s nothing at this address</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If someone shared a room with you, ask them for its 6-character code.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go to FastShare</Link>
      </Button>
    </div>
  </main>
);

export default NotFound;
