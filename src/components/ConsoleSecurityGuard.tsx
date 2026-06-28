import React, { useEffect } from "react";
import { useAppContext } from "../context";

export function ConsoleSecurityGuard() {
  const { companySettings } = useAppContext();
  const shopName = companySettings?.companyName || "Dicas by Ale VIP";

  useEffect(() => {
    // 1. Overwrite console to prevent logging and force-render safety warning banner
    const originalLog = console.log;
    
    const showSafetyWarning = () => {
      // Clear the console immediately to hide existing system lines
      try {
        console.clear();
      } catch (e) {}

      // Render the giant Facebook-like alert banner
      originalLog(
        "%cEspere!",
        "color: #ff0033; font-size: 52px; font-weight: 900; text-shadow: 3px 3px 0px #000; font-family: 'Impact', sans-serif; letter-spacing: 1px;"
      );
      originalLog(
        `%cEste é um recurso de navegador voltado para desenvolvedores. Se alguém disse para você copiar e colar algo aqui para ativar um recurso da ${shopName} ou "invadir" a conta de outra pessoa, isso é uma FRAUDE/GOLPE e você dará a ele acesso total à sua conta e informações financeiras.\n\nConsulte ${window.location.origin}/seguranca para dicas de segurança e ver boas práticas de como evitar golpes na internet.`,
        "font-size: 16px; font-family: sans-serif; font-weight: bold; line-height: 1.5; color: #1c1917; background-color: #fef2f2; border: 2px solid #fca5a5; padding: 12px; border-radius: 8px;"
      );
    };

    // Override console functions to lock output
    const noop = () => {
      showSafetyWarning();
    };

    try {
      window.console.log = noop;
      window.console.warn = noop;
      window.console.error = noop;
      window.console.info = noop;
      window.console.debug = noop;
    } catch (err) {}

    // Periodic clearing and warning enforcement loop
    const consoleInterval = setInterval(() => {
      showSafetyWarning();
    }, 1500);

    // 2. Prevent right-click context menu (blocks visual inspection route)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert(
        `[Segurança ${shopName}] O recurso "Inspecionar Elemento" foi desabilitado para proteção contra golpes de engenharia social (Self-XSS). Acesse a aba "Central de Segurança" no rodapé para saber mais.`
      );
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // 3. Block Developer Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Cmd+Opt+I)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isF12 = e.key === "F12";
      const isCtrlShiftI = e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i");
      const isCtrlShiftJ = e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j");
      const isCtrlShiftC = e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c");
      const isCtrlU = e.ctrlKey && (e.key === "U" || e.key === "u");
      
      // MacOS equivalents
      const isMacDevTools = e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c");
      const isMacViewSource = e.metaKey && e.altKey && (e.key === "U" || e.key === "u");

      if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC || isCtrlU || isMacDevTools || isMacViewSource) {
        e.preventDefault();
        alert(
          `[Proteção Antifraude ${shopName}] Os atalhos de desenvolvedor foram travados por segurança. Nunca execute códigos desconhecidos fornecidos por terceiros.`
        );
        return false;
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      clearInterval(consoleInterval);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [shopName]);

  return null; // Silent logic-only component
}
