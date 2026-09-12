const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    actor: { type: String, default: "admin", trim: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, default: "", trim: true },
    details: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditEvent", auditSchema);
