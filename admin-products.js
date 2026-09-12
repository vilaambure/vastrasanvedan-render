(() => {
  const table = document.querySelector("#products");
  if (!table) return;

  async function request(path, options = {}) {
    const response = await fetch(`/api/admin${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Product update failed.");
    return data;
  }

  function enhance() {
    table.querySelectorAll("tr").forEach((row) => {
      const statusCell = row.cells[4];
      const actionCell = row.cells[5];
      const deleteButton = row.querySelector("[data-delete]");
      if (!statusCell || !actionCell || !deleteButton || actionCell.dataset.enhanced) return;
      const id = deleteButton.dataset.delete;
      const text = String(statusCell.textContent || "").trim().toLowerCase();
      const active = text === "active" || text === "on" || text === "enabled";
      actionCell.dataset.enhanced = "true";
      const action = active ? "deactivate" : "activate";
      const label = active ? "Deactivate" : "Activate";
      actionCell.innerHTML = `<button class="${active ? "ghost" : "primary"}" data-product-action="${action}" data-product-id="${id}">${label}</button>`;
      actionCell.querySelector("button").onclick = async () => {
        const action = actionCell.querySelector("button").dataset.productAction;
        try {
          const nextState = action === "activate";
          await request(`/products/${id}/active`, { method: "PATCH", body: JSON.stringify({ active: nextState }) });
          window.location.reload();
        } catch (error) {
          window.alert(error.message);
        }
      };
    });
  }

  enhance();
  new MutationObserver(enhance).observe(table, { childList: true, subtree: true });
})();
