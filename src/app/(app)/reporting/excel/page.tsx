import { redirect } from "next/navigation";

// La passerelle Excel a été fondue dans l'onglet « Rapports & fiches I&P » de la page
// Reporting. On redirige les anciens liens plutôt que de laisser une page orpheline.
export default function ExcelBridgeRedirect() {
  redirect("/reporting");
}
