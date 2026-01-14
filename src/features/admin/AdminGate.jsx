import RequireAdmin from '../../auth/RequireAdmin';

export default function JoomlaAdminGate({ children }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
