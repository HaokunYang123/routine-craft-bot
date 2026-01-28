import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Deprecated: Auth is now handled via role selection on the main auth page.
 * This component redirects any old /login/coach links to the main auth page.
 */
export function CoachAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main auth page
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
