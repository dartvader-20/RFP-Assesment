import React from "react";
import { Box, Skeleton, Paper } from "@mui/material";

export default function FullScreenSkeleton() {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "#f7f9fc",
      }}
    >
      {/* Sidebar Skeleton */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          p: 3,
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <Skeleton variant="text" width={160} height={30} sx={{ mb: 3 }} />

        <Skeleton
          variant="rectangular"
          height={45}
          sx={{ mb: 3, borderRadius: 2 }}
        />

        {/* Sidebar RFP items */}
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={60}
            sx={{ mb: 2, borderRadius: 2 }}
          />
        ))}
      </Paper>

      {/* Main Chat Area Skeleton */}
      <Box sx={{ flex: 1, p: "20px 40px" }}>
        <Skeleton variant="text" width={220} height={35} sx={{ mb: 3 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* User bubble */}
          <Skeleton
            variant="rectangular"
            width="55%"
            height={70}
            sx={{ alignSelf: "flex-end", borderRadius: 3 }}
          />

          {/* Assistant bubble */}
          <Skeleton
            variant="rectangular"
            width="65%"
            height={110}
            sx={{ borderRadius: 3 }}
          />

          {/* User bubble */}
          <Skeleton
            variant="rectangular"
            width="45%"
            height={70}
            sx={{ alignSelf: "flex-end", borderRadius: 3 }}
          />
        </Box>

        {/* Input Box Skeleton */}
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
        </Box>
      </Box>
    </Box>
  );
}
