import React from "react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const Loading: React.FC = () => {
  return (
    <div>
      <Table className="table-fixed">
        <TableBody
          style={{
            height: 40,
            position: "relative",
          }}
        >
          <TableRow className="group">
            <TableCell className="px-2 py-1 h-10"></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default Loading;
