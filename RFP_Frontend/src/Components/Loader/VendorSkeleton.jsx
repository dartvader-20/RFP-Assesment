import React from "react";
import { Card, CardContent, Skeleton, Box } from "@mui/material";

export default function VendorSkeleton() {
  return (
    <Card>
      <CardContent>
        {/* Table Header Skeleton */}
        <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
          <Skeleton variant="text" width={120} height={30} />
          <Skeleton variant="text" width={120} height={30} />
          <Skeleton variant="text" width={120} height={30} />
          <Skeleton variant="text" width={120} height={30} />
          <Skeleton variant="text" width={80} height={30} />
        </Box>

        {/* 5 rows skeleton */}
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              gap: 3,
              mb: 2,
              alignItems: "center",
            }}
          >
            <Skeleton variant="rectangular" width={150} height={25} />
            <Skeleton variant="rectangular" width={200} height={25} />
            <Skeleton variant="rectangular" width={150} height={25} />
            <Skeleton variant="rectangular" width={150} height={25} />
            <Skeleton variant="circular" width={30} height={30} />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
