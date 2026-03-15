import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { AdvertiserPage } from "./pages/Advertiser";
import { PublisherPage } from "./pages/Publisher";
import { ViewerPage } from "./pages/Viewer";
import { DashboardPage } from "./pages/Dashboard";
import { TestPage } from "./pages/Test";
import Info from "./pages/Info";
import { GaslessPaymentPage } from "./pages/GaslessPayment";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: "advertiser",
                element: <AdvertiserPage />,
            },
            {
                path: "publisher",
                element: <PublisherPage />,
            },
            {
                path: "viewer",
                element: <ViewerPage />,
            },
            {
                path: "dashboard",
                element: <DashboardPage />,
            },
            {
                path: "info",
                element: <Info />,
            },
            {
                path: "gasless",
                element: <GaslessPaymentPage />,
            },
        ],
    },
    // Standalone publisher demo page (outside main layout)
    {
        path: "/demo",
        element: <TestPage />,
    },
]);
