import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Strip HTML
const stripHtml = (html) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// Base64 → Blob
const b64toBlob = (base64, type = "application/pdf") => {
  const byteChars = atob(base64);
  const byteNumbers = Array.from(byteChars).map((c) => c.charCodeAt(0));
  return new Blob([new Uint8Array(byteNumbers)], { type });
};

export default function ProposalRFP() {
  const navigate = useNavigate();
  const { rfpId } = useParams();
  const location = useLocation();
  const { draft = {}, vendorIds = [] } = location.state || {};

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState(draft.subject || "");
  const [emailBody, setEmailBody] = useState(
    draft.message ? stripHtml(draft.message) : ""
  );
  const [vendorEmails, setVendorEmails] = useState([]);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (draft.vendors) {
      setVendorEmails(draft.vendors.map((v) => v.email));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------
  // SEND EMAIL
  // ------------------------
  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      setSnack({
        open: true,
        message: "Email subject and body cannot be empty.",
        severity: "warning",
      });
      return;
    }

    try {
      setSendingEmail(true);

      await axios.post(`${API_BASE_URL}/api/email/send`, {
        rfpId: Number(rfpId),
        vendorIds: draft.vendors?.map((v) => Number(v.vendorId)) || vendorIds,
        subject: emailSubject.trim(),
        message: emailBody.trim(),
        status: "IN_REVIEW",
      });

      setSnack({
        open: true,
        message: "Proposal email sent successfully!",
        severity: "success",
      });

      navigate("/proposals");
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: "Failed to send proposal email.",
        severity: "error",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // ------------------------
  // PDF PREVIEW
  // ------------------------
  const previewPdfFromStructuredJson = () => {
    const structured = draft.structuredJson || draft.rfp?.structured;
    if (!structured) {
      setSnack({
        open: true,
        message: "No structured RFP found.",
        severity: "warning",
      });
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 40;
    let y = 40;

    doc.setFontSize(18);
    doc.text(structured.title || "RFP", left, y);
    y += 24;

    doc.setFontSize(11);
    if (structured.description) {
      const split = doc.splitTextToSize(
        `Description: ${structured.description}`,
        520
      );
      doc.text(split, left, y);
      y += split.length * 12 + 6;
    }

    if (structured.budget !== undefined) {
      doc.text(`Budget: $${structured.budget}`, left, y);
      y += 14;
    }

    if (structured.deliveryDays !== undefined) {
      doc.text(`Delivery Days: ${structured.deliveryDays}`, left, y);
      y += 18;
    }

    const items = structured.items || [];
    if (items.length) {
      autoTable(doc, {
        startY: y,
        head: [["#", "Item", "Qty", "Specifications"]],
        body: items.map((it, idx) => [
          idx + 1,
          it.name,
          it.quantity,
          Object.entries(it.specifications || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(", "),
        ]),
        margin: { left },
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    // Terms
    if (Array.isArray(structured.terms)) {
      doc.text("Terms & Conditions:", left, y);
      y += 14;
      structured.terms.forEach((t, i) => {
        const split = doc.splitTextToSize(`${i + 1}. ${t}`, 520);
        doc.text(split, left + 10, y);
        y += split.length * 12 + 6;
      });
    }

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const previewExistingPdf = () => {
    if (!draft.pdfBase64) return;
    const blob = b64toBlob(draft.pdfBase64);
    const url = URL.createObjectURL(blob);
    window.open(url);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Send Proposal Email
        </Typography>

        <Typography>Email Subject</Typography>
        <TextField
          fullWidth
          sx={{ my: 1 }}
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
        />

        <Typography>Email Body</Typography>
        <TextField
          fullWidth
          multiline
          minRows={8}
          sx={{ my: 1 }}
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
          {vendorEmails.map((email) => (
            <Chip key={email} label={email} color="primary" />
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          {(draft.structuredJson || draft.rfp?.structured) && (
            <Button variant="outlined" onClick={previewPdfFromStructuredJson}>
              Preview Structured PDF
            </Button>
          )}

          {draft.pdfBase64 && (
            <Button variant="outlined" onClick={previewExistingPdf}>
              Preview Uploaded PDF
            </Button>
          )}
        </Box>

        <Box sx={{ textAlign: "right", mt: 3 }}>
          <Button
            variant="contained"
            disabled={sendingEmail}
            onClick={handleSendEmail}
            startIcon={
              sendingEmail ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {sendingEmail ? "Sending..." : "Send Proposal Email"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
