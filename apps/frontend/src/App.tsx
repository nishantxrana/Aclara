import { Navigate, Route, Routes } from "react-router-dom";

import { useSessionStatus } from "@/api/insightops.api";
import { ConnectScreen } from "@/components/Connect/ConnectScreen";
import { AppLoadingShell } from "@/components/Layout/AppLoadingShell";
import { WorkspacePage } from "@/pages/WorkspacePage";

function SessionGate(props: { children: JSX.Element }): JSX.Element {
  const session = useSessionStatus();
  if (session.isPending) {
    return <AppLoadingShell message="Checking Azure DevOps connection…" />;
  }
  if (session.data?.connected !== true) {
    return <Navigate replace to="/connect" />;
  }
  return props.children;
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<ConnectScreen />} path="/connect" />
      <Route
        element={
          <SessionGate>
            <WorkspacePage />
          </SessionGate>
        }
        path="/workspace"
      />
      <Route element={<Navigate replace to="/workspace" />} path="/" />
      <Route element={<Navigate replace to="/workspace" />} path="*" />
    </Routes>
  );
}
