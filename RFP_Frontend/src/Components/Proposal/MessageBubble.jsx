// MessageBubble.jsx
import React from "react";
import {
  Box,
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  List,
  ListItem,
  Divider,
  Avatar,
  Stack,
  Chip,
  useTheme,
} from "@mui/material";

const formatVendorMessage = (raw) => {
  if (!raw) return null;

  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <Box
      sx={{
        background: "#fafafa",
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        p: 2,
        mt: 1,
        mb: 1,
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        fontSize: "0.9rem",
        lineHeight: 1.5,
      }}
    >
      {lines.join("\n")}
    </Box>
  );
};

const MessageBubble = ({ message }) => {
  const theme = useTheme();
  const isBuyer = message.sender === "BUYER";
  const isVendor = message.sender === "VENDOR";
  const isSystem = message.sender === "SYSTEM";
  const rfp = message.rfpSummary || null;

  const specsToString = (specs) => {
    if (!specs || Object.keys(specs).length === 0) return "-";
    return Object.entries(specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  };

  // Visual tokens
  const buyerBg = theme.palette.mode === "light" ? "#e3f2fd" : "#1565c0";
  const vendorBg = theme.palette.mode === "light" ? "#f5f5f5" : "#424242";
  const systemBg = theme.palette.mode === "light" ? "#fff8e1" : "#333";

  const bgColor = isSystem ? systemBg : isBuyer ? buyerBg : vendorBg;
  const textColor = isBuyer
    ? theme.palette.primary.dark
    : theme.palette.text.primary;

  // Border radii create a subtle "tail" by making the corner near the sender sharper
  const borderRadiusStyles = isBuyer
    ? {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }
    : isVendor
    ? {
        borderTopLeftRadius: 4,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }
    : { borderRadius: 12 };

  // avatar initials (fallback)
  const initials = isVendor
    ? message.vendorName
      ? message.vendorName
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
      : "V"
    : isBuyer
    ? "B"
    : "S";

  return (
    <Box
      display="flex"
      justifyContent={isSystem ? "center" : isBuyer ? "flex-end" : "flex-start"}
      mb={2}
      sx={{ width: "100%" }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "auto",
          maxWidth: "75%",
          p: 1.5,
          overflowX: "hidden",
          backgroundColor: bgColor,
          color: textColor,
          ...borderRadiusStyles,
          boxShadow: isSystem ? "none" : undefined,
        }}
      >
        {/* top row: avatar + name + timestamp */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: 12,
              bgcolor: isBuyer
                ? theme.palette.primary.main
                : theme.palette.grey[500],
            }}
          >
            {initials}
          </Avatar>

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {isVendor
              ? message.vendorName || "Vendor"
              : isBuyer
              ? message.buyerName || "Buyer"
              : "System"}
          </Typography>

          {/* small chip for role */}
          <Chip
            label={isSystem ? "SYSTEM" : isBuyer ? "BUYER" : "VENDOR"}
            size="small"
            sx={{ ml: 1 }}
          />

          {/* optional timestamp if present */}
          {message.sentAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: "auto" }}
            >
              {new Date(message.sentAt).toLocaleString()}
            </Typography>
          )}
        </Stack>

        {/* message body */}
        {isVendor ? (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Vendor Response
            </Typography>

            {message.structured && (
              <Box
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  p: 2,
                  mt: 1,
                  bgcolor: "#fff",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Vendor Structured Summary
                </Typography>

                {message.structured.title && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Title:</strong> {message.structured.title}
                  </Typography>
                )}
                {message.structured.description && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Description:</strong>{" "}
                    {message.structured.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                  {message.structured.budget && (
                    <Typography variant="body2">
                      <strong>Budget:</strong> $
                      {message.structured.budget.toLocaleString()}
                    </Typography>
                  )}
                  {message.structured.deliveryDays && (
                    <Typography variant="body2">
                      <strong>Delivery Days:</strong>{" "}
                      {message.structured.deliveryDays}
                    </Typography>
                  )}
                </Box>

                {Array.isArray(message.structured.items) &&
                  message.structured.items.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <TableContainer
                        sx={{ maxWidth: "100%", overflowX: "auto" }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Item
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Qty
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Specifications
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {message.structured.items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>
                                  {Object.entries(item.specifications || {})
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join("; ")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                {Array.isArray(message.structured.terms) &&
                  message.structured.terms.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Terms</Typography>
                      <List dense sx={{ pl: 2 }}>
                        {message.structured.terms.map((t, i) => (
                          <ListItem
                            key={i}
                            sx={{ display: "list-item", py: 0 }}
                          >
                            <Typography variant="body2">{t}</Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                {message.structured.vendorQuoteSummary && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 2, fontStyle: "italic", color: "text.secondary" }}
                  >
                    {message.structured.vendorQuoteSummary}
                  </Typography>
                )}

                {formatVendorMessage(message.rawMessage)}
              </Box>
            )}
          </Box>
        ) : (
          message.rawMessage && (
            <Typography sx={{ whiteSpace: "pre-wrap", color: textColor }}>
              {message.rawMessage}
            </Typography>
          )
        )}

        {/* buyer RFP summary */}
        {rfp && (
          <Box
            sx={{
              mt: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              RFP SUMMARY
            </Typography>

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Title:</strong> {rfp.title || "N/A"}
            </Typography>

            {rfp.description && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Description:</strong> {rfp.description}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
              {typeof rfp.budget !== "undefined" && (
                <Typography variant="body2">
                  <strong>Budget:</strong> $
                  {Number(rfp.budget).toLocaleString()}
                </Typography>
              )}
              {typeof rfp.deliveryDays !== "undefined" && (
                <Typography variant="body2">
                  <strong>Delivery Days:</strong> {rfp.deliveryDays}
                </Typography>
              )}
            </Box>

            {Array.isArray(rfp.items) && rfp.items.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Specifications
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rfp.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ whiteSpace: "normal" }}>
                            {it.name}
                          </TableCell>
                          <TableCell>{it.quantity ?? "-"}</TableCell>
                          <TableCell sx={{ whiteSpace: "normal" }}>
                            {specsToString(it.specifications)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {Array.isArray(rfp.terms) && rfp.terms.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Terms & Conditions
                </Typography>
                <List dense sx={{ pl: 2 }}>
                  {rfp.terms.map((t, i) => (
                    <ListItem key={i} sx={{ display: "list-item", py: 0 }}>
                      <Typography variant="body2">{`${
                        i + 1
                      }. ${t}`}</Typography>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}

        {/* attachment */}
        {message.attachmentUrl && (
          <Typography
            variant="body2"
            color="primary"
            sx={{ mt: 1, cursor: "pointer" }}
            onClick={() => window.open(message.attachmentUrl, "_blank")}
          >
            📎 View Attachment
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble;
