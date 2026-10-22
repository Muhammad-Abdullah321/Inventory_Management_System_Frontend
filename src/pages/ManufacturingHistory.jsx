import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Alert, DataTable, formatDate, formatMoney, Loading, PageTitle } from "../components/Common.jsx";

const PAGE_SIZE = 20;

const costingLabel = (run) => run.costingComplete
  ? "Complete — materials only"
  : "Incomplete — materials only";

export default function ManufacturingHistory() {
  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadRuns = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/manufacturing/runs", {
        params: { page, pageSize: PAGE_SIZE },
      });
      setRuns(response.data.data.items);
      setPagination(response.data.data.pagination);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  async function openRun(runId) {
    setDetailLoading(true);
    setDetailError("");
    setSelectedRun(null);
    try {
      const response = await api.get(`/manufacturing/runs/${encodeURIComponent(runId)}`);
      setSelectedRun(response.data.data);
    } catch (requestError) {
      setDetailError(getErrorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  const runColumns = [
    { key: "finishedProduct", label: "Finished product", render: (run) => run.finishedProduct?.name || run.finishedProduct?.sku || "—" },
    { key: "output", label: "Output", align: "right", render: (run) => `${run.outputQuantity} ${run.outputUnit}` },
    { key: "createdAt", label: "Date", render: (run) => formatDate(run.createdAt) },
    { key: "costing", label: "Costing status", render: costingLabel },
    {
      key: "materialCost",
      label: "Known material cost",
      align: "right",
      render: (run) => run.knownMaterialCostSubtotal == null
        ? "Unresolved"
        : `${formatMoney(run.knownMaterialCostSubtotal)} (materials only)`,
    },
    { key: "actions", label: "Details", render: (run) => <button className="button button-small" onClick={() => openRun(run.id)}>View run</button> },
  ];
  const materialColumns = [
    { key: "product", label: "Raw material", render: (material) => material.product?.name || material.product?.sku || "—" },
    {
      key: "enteredInput",
      label: "Entered input",
      align: "right",
      render: (material) => material.inputMode === "QUANTITY"
        ? `${material.enteredQuantity} ${material.unit} (quantity)`
        : `${formatMoney(material.enteredCost)} (cost)`,
    },
    { key: "consumed", label: "Consumed", align: "right", render: (material) => `${material.consumedQuantity} ${material.unit}` },
    { key: "source", label: "Purchase cost source", render: (material) => material.sourcePurchaseItem
      ? `Purchase line ${material.sourcePurchaseItem.id}: ${material.sourcePurchaseItem.quantity} ${material.sourcePurchaseItem.unit || material.unit} for ${formatMoney(material.sourcePurchaseItem.totalCost)}; ${formatMoney(material.sourcePurchaseItem.unitCost)} per ${material.sourcePurchaseItem.unit || material.unit}`
      : "No purchase cost source" },
    { key: "materialCost", label: "Known material cost", align: "right", render: (material) => material.materialCost == null
      ? "Unresolved"
      : `${formatMoney(material.materialCost)}${material.costStatus === "ROUNDED" ? " (rounded)" : ""}` },
    { key: "costStatus", label: "Cost status" },
  ];

  return (
    <>
      <PageTitle title="Manufacturing history" subtitle="Completed production runs and their recorded material-cost snapshots" />
      <Alert message={error} />
      <section className="panel">
        <div className="section-heading">
          <h2>Completed runs</h2>
          <button className="button button-small" onClick={() => loadRuns(pagination.page)} disabled={loading}>Refresh</button>
        </div>
        {loading
          ? <Loading label="Loading manufacturing runs..." />
          : <DataTable columns={runColumns} rows={runs} emptyMessage="No manufacturing runs have been recorded." />}
        {!loading && pagination.totalPages > 1 && (
          <div className="form-actions">
            <button className="button button-small" onClick={() => loadRuns(pagination.page - 1)} disabled={pagination.page <= 1}>Previous</button>
            <span className="form-hint">Page {pagination.page} of {pagination.totalPages} · {pagination.total} runs</span>
            <button className="button button-small" onClick={() => loadRuns(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next</button>
          </div>
        )}
      </section>
      {(detailLoading || detailError || selectedRun) && (
        <section className="panel detail-panel">
          <div className="section-heading">
            <h2>Run details</h2>
            <button className="button button-small" onClick={() => { setSelectedRun(null); setDetailError(""); }}>Close</button>
          </div>
          <Alert message={detailError} />
          {detailLoading && <Loading label="Loading run details..." />}
          {selectedRun && (
            <>
              <dl className="detail-grid">
                <div><dt>Finished product</dt><dd>{selectedRun.finishedProduct?.name || selectedRun.finishedProduct?.sku || "—"}</dd></div>
                <div><dt>Output</dt><dd>{selectedRun.outputQuantity} {selectedRun.outputUnit}</dd></div>
                <div><dt>Completed</dt><dd>{formatDate(selectedRun.createdAt)}</dd></div>
                <div><dt>Recorded by</dt><dd>{selectedRun.actor?.name || "—"}</dd></div>
                <div><dt>Costing status</dt><dd>{costingLabel(selectedRun)}</dd></div>
                <div><dt>Known material-cost subtotal</dt><dd>{selectedRun.knownMaterialCostSubtotal == null ? "Unresolved" : formatMoney(selectedRun.knownMaterialCostSubtotal)}</dd></div>
                {selectedRun.costingComplete && (
                  <div><dt>Total material cost</dt><dd>{formatMoney(selectedRun.totalMaterialCost)}</dd></div>
                )}
              </dl>
              <p className="form-hint">All costs shown are materials only. Labor and other manufacturing costs are not included.</p>
              <h3 className="subheading">Material consumption</h3>
              <DataTable columns={materialColumns} rows={selectedRun.materials || []} emptyMessage="No material lines recorded." />
            </>
          )}
        </section>
      )}
    </>
  );
}
