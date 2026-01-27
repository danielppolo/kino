"use client";

import React from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { useCurrency, useTags } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getTagCloudAnalytics } from "@/utils/supabase/queries";

interface TagCloudAnalyticsChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

export function TagCloudAnalyticsChart({
  walletId,
  from,
  to,
}: TagCloudAnalyticsChartProps) {
  const {
    data: tagData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tag-cloud-analytics", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getTagCloudAnalytics(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const { baseCurrency } = useCurrency();
  const [, tagMap] = useTags();

  const getTagName = (tagId: string) => {
    return tagMap.get(tagId)?.title || tagId;
  };

  const maxCount = React.useMemo(() => {
    if (!tagData || tagData.length === 0) return 1;
    return Math.max(...tagData.map((t) => t.count));
  }, [tagData]);

  const getFontSize = (count: number) => {
    const minSize = 12;
    const maxSize = 32;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tag Analytics</CardTitle>
          <CardDescription>
            Most frequently used transaction tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tag Analytics</CardTitle>
          <CardDescription>
            Most frequently used transaction tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tagData || tagData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tag Analytics</CardTitle>
          <CardDescription>
            Most frequently used transaction tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No tag data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Analytics</CardTitle>
        <CardDescription>Most frequently used transaction tags</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[200px] flex-wrap items-center justify-center gap-4 py-4">
          {tagData.slice(0, 20).map((tag, index) => (
            <div
              key={tag.tag}
              className="bg-muted hover:bg-muted/80 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 transition-colors"
              style={{
                fontSize: `${getFontSize(tag.count)}px`,
              }}
              title={`${tag.count} transactions`}
            >
              <span className="font-medium">{getTagName(tag.tag)}</span>
              <span className="text-muted-foreground text-xs">
                ({tag.count})
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t pt-4">
          <h4 className="mb-2 text-sm font-medium">Top Tags by Amount</h4>
          <div className="grid gap-2">
            {tagData.slice(0, 5).map((tag) => (
              <div
                key={tag.tag}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getTagName(tag.tag)}</span>
                  <span className="text-muted-foreground">
                    ({tag.count} tx)
                  </span>
                </div>
                <Money cents={tag.total_amount_cents} currency={baseCurrency} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
