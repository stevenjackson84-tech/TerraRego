/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from './pages/Analytics';
import BusinessPlan from './pages/BusinessPlan';
import CADDrafter from './pages/CADDrafter';
import Calendar from './pages/Calendar';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DealDetails from './pages/DealDetails';
import Deals from './pages/Deals';
import Development from './pages/Development';
import EmailTemplates from './pages/EmailTemplates';
import Entitlements from './pages/Entitlements';
import Favorites from './pages/Favorites';
import FinancialDashboard from './pages/FinancialDashboard';
import FloorPlansLibrary from './pages/FloorPlansLibrary';
import GISMap from './pages/GISMap';
import LeanSixSigma from './pages/LeanSixSigma';
import Marketplace from './pages/Marketplace';
import PlanCheck from './pages/PlanCheck';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import PropertyDetails from './pages/PropertyDetails';
import Reports from './pages/Reports';
import SiteAnalysis from './pages/SiteAnalysis';
import Takeoff from './pages/Takeoff';
import Tasks from './pages/Tasks';
import UnitCostLibrary from './pages/UnitCostLibrary';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "BusinessPlan": BusinessPlan,
    "CADDrafter": CADDrafter,
    "Calendar": Calendar,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "DealDetails": DealDetails,
    "Deals": Deals,
    "Development": Development,
    "EmailTemplates": EmailTemplates,
    "Entitlements": Entitlements,
    "Favorites": Favorites,
    "FinancialDashboard": FinancialDashboard,
    "FloorPlansLibrary": FloorPlansLibrary,
    "GISMap": GISMap,
    "LeanSixSigma": LeanSixSigma,
    "Marketplace": Marketplace,
    "PlanCheck": PlanCheck,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "PropertyDetails": PropertyDetails,
    "Reports": Reports,
    "SiteAnalysis": SiteAnalysis,
    "Takeoff": Takeoff,
    "Tasks": Tasks,
    "UnitCostLibrary": UnitCostLibrary,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};