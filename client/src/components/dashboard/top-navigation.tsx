import { Button } from "@/components/ui/button";
import { Upload, Bell, Menu } from "lucide-react";

interface TopNavigationProps {
  title: string;
  onMenuClick?: () => void;
  onImportClick?: () => void;
  lastUpdated?: string;
}

export const TopNavigation = ({
  title,
  onMenuClick,
  onImportClick,
  lastUpdated = new Date().toLocaleString()
}: TopNavigationProps) => {
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-primary-200 shadow">
      <button 
        type="button" 
        className="px-4 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-secondary md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <span className="text-gray-200 text-lg font-medium">{title}</span>
        </div>
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <div className="flex items-center">
            <span className="text-xs text-gray-400">Last update:</span>
            <span className="ml-1 text-xs text-gray-300 mono">{lastUpdated}</span>
          </div>
          
          <button 
            type="button" 
            className="bg-primary-100 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
          </button>

          <span className="inline-flex rounded-md shadow-sm">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={onImportClick}
            >
              <Upload className="-ml-0.5 mr-2 h-4 w-4" />
              Import Data
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
};
