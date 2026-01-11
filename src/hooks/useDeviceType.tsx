import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export type DeviceType = "mobile" | "tablet" | "desktop";

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>("desktop");

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      // Check if running as PWA (standalone mode)
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true;
      
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType("mobile");
      } else if (width < 1024) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return deviceType;
}

export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = React.useState(false);

  React.useEffect(() => {
    const checkPWA = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
      setIsPWA(standalone);
    };

    checkPWA();
  }, []);

  return isPWA;
}
