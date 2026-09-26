import TotalumDashboard from "@/components/TotalumDashboard";
import BuilderHome from "@/components/builder/BuilderHome";

export default function Home() {
  return process.env.TOTALUM_VCAAS_API_KEY?.trim() ? (
    <TotalumDashboard />
  ) : (
    <BuilderHome />
  );
}
