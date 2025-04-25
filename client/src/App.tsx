import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import UsdPortfolio from "@/pages/usd-portfolio";
import CadPortfolio from "@/pages/cad-portfolio";
import IntlPortfolio from "@/pages/intl-portfolio";
import MatrixRulesPage from "@/pages/matrix-rules";
import EtfHoldings from "@/pages/etf-holdings";
import DataManagement from "@/pages/data-management";
import EarningsPage from "@/pages/earnings-page";
import { Header } from "@/components/layout/header";

function Router() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        <main className="h-full overflow-y-auto focus:outline-none bg-background">
          <Switch>
            <Route path="/" component={UsdPortfolio} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/usd-portfolio" component={UsdPortfolio} />
            <Route path="/cad-portfolio" component={CadPortfolio} />
            <Route path="/intl-portfolio" component={IntlPortfolio} />
            <Route path="/matrix-rules" component={MatrixRulesPage} />
            <Route path="/etf-holdings" component={EtfHoldings} />
            <Route path="/data-management" component={DataManagement} />
            <Route path="/earnings" component={EarningsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
