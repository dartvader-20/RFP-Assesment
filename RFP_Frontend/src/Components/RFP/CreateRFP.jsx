import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  TextField,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { API_BASE_URL } from "../../config";
import FullScreenSkeleton from "../Loader/FullScreenSkeleton";
import CreateProposalDialog from "./CreateProposalDialog";

const getStatusStyle = (status) => {
  switch (status) {
    case "OPEN":
      return { bgcolor: "#16a34a", label: "OPEN" }; // green
    case "CLOSED":
      return { bgcolor: "#dc2626", label: "CLOSED" }; // red
    case "IN_REVIEW":
      return { bgcolor: "#eab308", label: "IN REVIEW" }; // yellow
    default:
      return { bgcolor: "#64748b", label: status };
  }
};

export default function CreateRFP() {
  const [rfpList, setRfpList] = useState([]);
  const USER_ID = 12345;
  const [selectedRFP, setSelectedRFP] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [structuredData, setStructuredData] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  useEffect(() => {
    const fetchRFPList = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/rfps?userId=${USER_ID}`
        );
        setRfpList(res.data);
      } catch (err) {
        console.error("Failed to load RFP list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRFPList();
  }, []);

  const handleSelectRFP = async (rfpId) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/rfps?userId=${USER_ID}&rfpId=${rfpId}`
      );

      setSelectedRFP(res.data);
      setChatHistory(res.data.chatMessages || []);
      setStructuredData(res.data.structured || null);
    } catch (err) {
      console.error("Failed to fetch RFP details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    // CASE 1 — If no RFP selected → CREATE A NEW RFP
    if (!selectedRFP) {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/rfps`, {
          userId: USER_ID,
          userQuery: message,
        });

        // 1) Extract new RFP ID
        const newRfpId = res.data.rfpId;

        // 2) Fetch full RFP details
        const fullRFP = await axios.get(
          `${API_BASE_URL}/api/rfps?userId=${USER_ID}&rfpId=${newRfpId}`
        );

        // 3) Update UI with complete data
        setSelectedRFP(fullRFP.data);
        setChatHistory(fullRFP.data.chatMessages || []);
        setStructuredData(fullRFP.data.structured || null);

        // 4) Add to sidebar
        setRfpList((prev) => [...prev, fullRFP.data]);

        setSnackbarMessage("New RFP created successfully");
        setSnackbarOpen(true);
        setMessage("");
        return;
      } catch (err) {
        console.error("Failed to create new RFP:", err);
        setSnackbarMessage("Failed to create RFP");
        setSnackbarOpen(true);
        return;
      } finally {
        setLoading(false);
      }
    }

    // CASE 2 — Update EXISTING RFP
    try {
      await axios.put(
        `${API_BASE_URL}/api/rfps?userId=${USER_ID}&rfpId=${selectedRFP.rfpId}`,
        { userQuery: message }
      );

      setSnackbarMessage("RFP updated successfully");
      setSnackbarOpen(true);
      setMessage("");

      // Reload updated RFP
      const res = await axios.get(
        `${API_BASE_URL}/api/rfps?userId=${USER_ID}&rfpId=${selectedRFP.rfpId}`
      );

      setSelectedRFP(res.data);
      setChatHistory(res.data.chatMessages || []);
      setStructuredData(res.data.structured || null);
    } catch (err) {
      console.error("Failed to update RFP:", err);
      setSnackbarMessage("Failed to update RFP");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRFP = async (rfpId) => {
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE_URL}/api/rfps?userId=${USER_ID}&rfpId=${rfpId}`
      );
      // Remove deleted RFP from state
      setRfpList(rfpList.filter((rfp) => rfp.rfpId !== rfpId));
      // Clear selection if deleted
      if (selectedRFP?.rfpId === rfpId) {
        setSelectedRFP(null);
        setChatHistory([]);
        setStructuredData(null);
      }
    } catch (err) {
      console.error("Failed to delete RFP:", err);
    } finally {
      setLoading(false);
    }
  };

  // helper: attempt to parse assistantMessage and return object or null
  const tryParseAssistant = (assistantMessage) => {
    if (!assistantMessage) return null;
    if (typeof assistantMessage === "object") return assistantMessage;

    try {
      // sometimes backend stores a JSON string; parse it
      return JSON.parse(assistantMessage);
    } catch {
      return null;
    }
  };

  // helper: render a formatted assistant bubble when it's structured
  const AssistantStructured = ({ obj }) => {
    if (!obj) return null;

    const items = obj.items || [];
    const terms = obj.terms || [];
    return (
      <Box>
        {obj.title && (
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{obj.title}</Typography>
        )}
        {obj.description && (
          <Typography sx={{ mb: 1 }}>{obj.description}</Typography>
        )}

        <Box sx={{ display: "flex", gap: 3, mb: 1 }}>
          {obj.budget !== undefined && (
            <Typography>
              <b>Budget:</b> ${obj.budget}
            </Typography>
          )}
          {obj.deliveryDays !== undefined && (
            <Typography>
              <b>Delivery Days:</b> {obj.deliveryDays}
            </Typography>
          )}
        </Box>

        {items.length > 0 && (
          <>
            <Typography sx={{ fontWeight: 600, mt: 1 }}>Items:</Typography>
            <Box
              component="table"
              sx={{ width: "100%", mt: 1, borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th
                    style={{
                      padding: 8,
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Item
                  </th>
                  <th
                    style={{
                      padding: 8,
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Quantity
                  </th>
                  <th
                    style={{
                      padding: 8,
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Specifications
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td
                      style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}
                    >
                      {it.name}
                    </td>
                    <td
                      style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}
                    >
                      {it.quantity}
                    </td>
                    <td
                      style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}
                    >
                      {it.specifications &&
                      Object.keys(it.specifications).length > 0
                        ? Object.entries(it.specifications)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {obj.vendorSuggestions && obj.vendorSuggestions.length > 0 && (
                <>
                  <Typography sx={{ mt: 2, fontWeight: 600 }}>
                    Vendor Suggestions:
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    {obj.vendorSuggestions.map((v, i) => (
                      <Paper
                        key={i}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 2,
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Typography>
                          <b>Vendor Type:</b> {v.vendorType}
                        </Typography>
                        <Typography sx={{ mt: 0.5 }}>
                          <b>Reason:</b> {v.reason}
                        </Typography>

                        {/* vendorNames — show if present */}
                        {v.vendorNames && v.vendorNames.length > 0 && (
                          <Box
                            sx={{
                              mt: 1,
                              display: "flex",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography sx={{ mt: 0.5 }}>
                              <b>Vendor Name:</b> {v.vendorNames.join(", ")}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          </>
        )}
        {terms.length > 0 && (
          <>
            <Typography sx={{ mt: 2, fontWeight: 600 }}>Terms:</Typography>
            <ul>
              {terms.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </>
        )}
      </Box>
    );
  };

  // Render the assistant message (formatted if possible)
  const renderAssistantMessage = (assistantMessage) => {
    const parsed = tryParseAssistant(assistantMessage);
    if (parsed && (parsed.items || parsed.budget || parsed.title)) {
      // render formatted structured content
      return <AssistantStructured obj={parsed} />;
    }

    // fallback: plain text (preserve newlines)
    return (
      <Typography sx={{ whiteSpace: "pre-wrap" }}>
        {assistantMessage}
      </Typography>
    );
  };

  const handleNewRFP = () => {
    setSelectedRFP(null);
    setChatHistory([]);
    setStructuredData(null);
    setMessages([]);
    setMessage("");
  };
  if (loading) {
    return <FullScreenSkeleton />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#f7f9fc",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          borderRight: "1px solid #e5e7eb",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
          RFP History
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={handleNewRFP}
          sx={{
            borderRadius: 2,
            mb: 3,
            py: 1.3,
            bgcolor: "#2563eb",
            "&:hover": { bgcolor: "#1e40af" },
            fontWeight: 600,
          }}
        >
          + NEW RFP
        </Button>

        <List sx={{ mt: 1 }}>
          {rfpList.map((item) => {
            const isSelected = selectedRFP?.rfpId === item.rfpId;

            const { bgcolor, label } = getStatusStyle(item.status);

            return (
              <ListItem
                key={item.rfpId}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  bgcolor: isSelected ? "#dbeafe" : "#f1f5f9",
                  border: isSelected
                    ? "2px solid #2563eb"
                    : "1px solid #e5e7eb",
                  transition: "0.2s",
                  px: 2,
                  py: 1.5,
                  "&:hover": {
                    bgcolor: isSelected ? "#dbeafe" : "#e2e8f0",
                  },
                }}
                onClick={() => handleSelectRFP(item.rfpId)}
              >
                {/* LEFT SIDE: TITLE + BADGE + UPDATED DATE */}
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {/* Title + Badge row */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                      {item.title || "Untitled RFP"}
                    </Typography>

                    <Box
                      sx={{
                        px: 1.4,
                        py: 0.2,
                        borderRadius: 1,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        bgcolor,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </Box>
                  </Box>

                  {/* Updated Date */}
                  <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>

                {/* Delete Icon */}
                <IconButton
                  edge="end"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRFP(item.rfpId);
                  }}
                >
                  <Delete />
                </IconButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* CHAT AREA */}
      <Box
        sx={{
          flex: 1,
          p: "20px 40px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            bgcolor: "#fff",
            zIndex: 5,
            pb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {selectedRFP ? selectedRFP.title : "Create RFP"}
          </Typography>

          {selectedRFP && (
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* Show Create Proposal for OPEN and IN_REVIEW */}
              {(selectedRFP.status === "OPEN" ||
                selectedRFP.status === "IN_REVIEW") && (
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#16a34a",
                    "&:hover": { bgcolor: "#15803d" },
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                  onClick={() => setProposalOpen(true)}
                >
                  Create Proposal
                </Button>
              )}

              {/* Show View Proposals ONLY for IN_REVIEW */}
              {selectedRFP.status === "IN_REVIEW" && (
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#eab308",
                    "&:hover": { bgcolor: "#ca8a04" },
                    fontWeight: 600,
                    borderRadius: 2,
                    color: "black",
                  }}
                  onClick={() => (window.location.href = "/proposals")}
                >
                  View Proposals
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Chat Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            pr: 2,
            mt: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            minHeight: 0,
          }}
        >
          {/* map chat history */}
          {selectedRFP &&
            chatHistory.length > 0 &&
            chatHistory.map((chat, index) => {
              return (
                <React.Fragment key={chat.messageId ?? index}>
                  {/* user message */}
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: "60%",
                      borderRadius: 3,
                      alignSelf: "flex-end",
                      bgcolor: "#2563eb",
                      color: "#ffffff",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {chat.userMessage}
                  </Paper>

                  {/* assistant formatted */}
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: "60%",
                      borderRadius: 3,
                      alignSelf: "flex-start",
                      bgcolor: "#e2e8f0",
                      color: "#1e293b",
                    }}
                  >
                    {renderAssistantMessage(chat.assistantMessage)}
                  </Paper>
                </React.Fragment>
              );
            })}

          {/* If there are ad-hoc messages (new messages state) */}
          {messages.map((m, i) => (
            <Paper
              key={`new-${i}`}
              sx={{
                p: 2,
                maxWidth: "60%",
                borderRadius: 3,
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                bgcolor: m.sender === "user" ? "#2563eb" : "#e2e8f0",
                color: m.sender === "user" ? "#fff" : "#1e293b",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </Paper>
          ))}

          {structuredData && (
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                bottom: 0,
                mt: 2,
                zIndex: 2,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Final RFP Summary
              </Typography>

              <Typography>
                <b>Title:</b> {structuredData.title}
              </Typography>
              <Typography>
                <b>Description:</b> {structuredData.description}
              </Typography>
              <Typography>
                <b>Budget:</b> ${structuredData.budget}
              </Typography>
              <Typography>
                <b>Delivery Days:</b> {structuredData.deliveryDays}
              </Typography>

              <Typography sx={{ mt: 2, fontWeight: 600 }}>Items:</Typography>
              <table
                style={{
                  width: "100%",
                  marginTop: "10px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>
                      Item
                    </th>
                    <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>
                      Quantity
                    </th>
                    <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>
                      Specifications
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(structuredData.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td
                        style={{ padding: "8px", border: "1px solid #e2e8f0" }}
                      >
                        {it.name}
                      </td>
                      <td
                        style={{ padding: "8px", border: "1px solid #e2e8f0" }}
                      >
                        {it.quantity}
                      </td>
                      <td
                        style={{ padding: "8px", border: "1px solid #e2e8f0" }}
                      >
                        {it.specifications &&
                        Object.keys(it.specifications).length
                          ? Object.entries(it.specifications)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {structuredData.vendorSuggestions &&
                structuredData.vendorSuggestions.length > 0 && (
                  <>
                    <Typography sx={{ mt: 2, fontWeight: 600 }}>
                      Vendor Suggestions:
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      {structuredData.vendorSuggestions.map((v, i) => (
                        <Paper
                          key={i}
                          sx={{
                            p: 1.5,
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Typography>
                            <b>Vendor Type:</b> {v.vendorType}
                          </Typography>
                          <Typography sx={{ mt: 0.5 }}>
                            <b>Reason:</b> {v.reason}
                          </Typography>
                          <Typography sx={{ mt: 0.5 }}>
                            <b>Vendor Names:</b> {v.vendorNames.join(", ")}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </>
                )}

              <Typography sx={{ mt: 2, fontWeight: 600 }}>Terms:</Typography>
              <ul>
                {(structuredData.terms || []).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Paper>
          )}
        </Box>

        {/* INPUT BOX */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            display: "flex",
            gap: 2,
            borderTop: "1px solid #e5e7eb",
            mt: 2,
          }}
        >
          <TextField
            fullWidth
            placeholder={
              selectedRFP
                ? "Update your existing RFP..."
                : "Describe the RFP you want to generate..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <Button
            variant="contained"
            onClick={handleSend}
            sx={{
              px: 3,
              borderRadius: 2,
              fontWeight: 600,
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1e40af" },
            }}
          >
            SEND
          </Button>
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <CreateProposalDialog
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        rfp={structuredData}
        rfpId={selectedRFP?.rfpId}
      />
    </Box>
  );
}
