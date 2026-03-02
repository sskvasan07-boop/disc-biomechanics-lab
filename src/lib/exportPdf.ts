import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface SimulationData {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
}

interface ExportOptions {
  data: SimulationData;
  chartElement: HTMLElement | null;
  viewportCanvas: HTMLCanvasElement | null;
}

function getMetrics(data: SimulationData) {
  const crossSectionalArea = 1500;
  const stress = data.axialLoad / crossSectionalArea;
  const youngModulus = data.discHealth === "healthy" ? 10 : data.discHealth === "mild" ? 6 : 3;
  const strain = stress / youngModulus;

  const loadFactor = data.axialLoad / 2000;
  const angleFactor = Math.abs(data.flexionAngle) / 15;
  const healthMultiplier = data.discHealth === "healthy" ? 0.5 : data.discHealth === "mild" ? 1 : 1.8;
  const herniationRisk = Math.min(
    100,
    Math.round((loadFactor * 0.5 + angleFactor * 0.3 + loadFactor * angleFactor * 0.2) * healthMultiplier * 100)
  );

  return { stress, strain, youngModulus, herniationRisk };
}

export async function exportSimulationPdf(
  options: ExportOptions
) {
  const { data, chartElement, viewportCanvas } = options;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const metrics = getMetrics(data);
  const healthLabel = data.discHealth === "healthy" ? "Healthy" : data.discHealth === "mild" ? "Mild Degeneration" : "Severely Degenerated";

  // Header
  pdf.setFillColor(15, 20, 30);
  pdf.rect(0, 0, pageWidth, 38, "F");
  pdf.setTextColor(0, 210, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("IVD-Sim: Spinal Stress Analysis", 15, 18);
  pdf.setFontSize(9);
  pdf.setTextColor(140, 160, 180);
  pdf.text("Biomechanical Analysis Report", 15, 26);
  pdf.text(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 15, 32);
  pdf.text(`Time: ${new Date().toLocaleTimeString()}`, pageWidth - 15, 32, { align: "right" });

  let y = 48;

  // Simulation Parameters
  pdf.setTextColor(0, 210, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Input Parameters", 15, y);
  y += 10;

  pdf.setFontSize(10);
  const params = [
    ["Axial Load", `${data.axialLoad} N`],
    ["Flexion / Extension Angle", `${data.flexionAngle}°`],
    ["Disc Health Status", healthLabel],
  ];
  params.forEach(([label, value]) => {
    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${label}:`, 20, y);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, 85, y);
    y += 7;
  });

  y += 8;

  // Computed Metrics
  pdf.setTextColor(0, 210, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Computed Metrics & Results", 15, y);
  y += 10;

  pdf.setFontSize(10);
  const metricsRows = [
    ["Peak Stress (σ)", `${metrics.stress.toFixed(3)} MPa`],
    ["Disc Strain (ε)", `${(metrics.strain * 100).toFixed(2)} %`],
    ["Young's Modulus", `${metrics.youngModulus} MPa`],
    ["Herniation Risk", `${metrics.herniationRisk} %`],
  ];
  metricsRows.forEach(([label, value]) => {
    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${label}:`, 20, y);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, 85, y);
    y += 7;
  });

  y += 6;

  // Risk Assessment
  pdf.setTextColor(0, 210, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Risk Assessment", 15, y);
  y += 10;

  const riskLevel = metrics.herniationRisk < 30 ? "Low" : metrics.herniationRisk < 65 ? "Moderate" : "High";
  const riskColor: [number, number, number] = metrics.herniationRisk < 30 ? [34, 197, 94] : metrics.herniationRisk < 65 ? [234, 179, 8] : [239, 68, 68];
  pdf.setFillColor(...riskColor);
  pdf.roundedRect(20, y - 4, 55, 8, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(`${riskLevel} Risk (${metrics.herniationRisk}%)`, 23, y + 1.5);
  y += 16;

  // 3D Viewport Capture
  if (viewportCanvas) {
    try {
      const imgData = viewportCanvas.toDataURL("image/png");
      const imgWidth = pageWidth - 30;
      const imgHeight = (viewportCanvas.height / viewportCanvas.width) * imgWidth;
      const cappedHeight = Math.min(imgHeight, 70);

      pdf.setTextColor(0, 210, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("3D Viewport — Disc Deformation", 15, y);
      y += 6;
      pdf.addImage(imgData, "PNG", 15, y, imgWidth, cappedHeight);
      y += cappedHeight + 8;
    } catch (e) {
      console.warn("Could not capture 3D viewport for PDF", e);
    }
  }

  // Chart capture
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: "#0f1520",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      const cappedHeight = Math.min(imgHeight, 55);

      // Check if we need a new page
      if (y + cappedHeight + 20 > pageHeight) {
        pdf.addPage();
        y = 20;
      }

      pdf.setTextColor(0, 210, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Stress vs Strain Curve", 15, y);
      y += 6;
      pdf.addImage(imgData, "PNG", 15, y, imgWidth, cappedHeight);
    } catch (e) {
      console.warn("Could not capture chart for PDF", e);
    }
  }

  // Footer
  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);
  pdf.setTextColor(160, 160, 160);
  pdf.setFontSize(8);
  pdf.text("IVD-Sim — Spinal Stress Analysis Report", 15, pageHeight - 13);
  pdf.text("For research and educational purposes only", pageWidth / 2, pageHeight - 13, { align: "center" });
  pdf.setFontSize(7);
  pdf.setTextColor(130, 130, 130);
  pdf.text("Prepared by: S. S. Keerthi Vasan, K. Priyadharshini, Siddiraju Mamatha", pageWidth / 2, pageHeight - 8, { align: "center" });

  pdf.save(`ivd-sim-report-${Date.now()}.pdf`);
}
