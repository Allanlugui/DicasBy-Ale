import React, { useEffect } from "react";

export function ConsoleSecurityGuard() {
  useEffect(() => {
    // Console blocks and warnings completely disabled for debugging.
  }, []);

  return null; // Silent logic-only component
}

