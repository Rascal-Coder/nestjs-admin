import { Adapter, Helper, Model } from "casbin";
import type { PrismaClient } from "@/generated/prisma/client";
import type { CasbinRule } from "@/generated/prisma/client";

/**
 * Casbin 持久化到 casbin_rule 表；与官方 ptype + v0..v5 行格式一致。
 */
export class PrismaCasbinAdapter implements Adapter {
  constructor(private readonly prisma: PrismaClient) {}

  async loadPolicy(model: Model): Promise<void> {
    const rows = await this.prisma.casbinRule.findMany();
    for (const row of rows) {
      const line = this.rowToLine(row);
      Helper.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    await this.prisma.casbinRule.deleteMany();
    const lines = this.modelToPolicyLines(model);
    for (const line of lines) {
      const data = this.lineToRow(line);
      await this.prisma.casbinRule.create({ data });
    }
    return true;
  }

  /** Casbin 5 无 Helper.policyToString，按 p/g 段从 Model 导出为 CSV 行 */
  private modelToPolicyLines(model: Model): string[] {
    const lines: string[] = [];
    for (const sec of ["p", "g"] as const) {
      const astMap = model.model.get(sec);
      if (!astMap) continue;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          lines.push([ptype, ...rule].join(", "));
        }
      }
    }
    return lines;
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    const data = this.lineToRow([ptype, ...rule].join(", "));
    await this.prisma.casbinRule.create({ data });
  }

  async removePolicy(
    _sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const data = this.lineToRow([ptype, ...rule].join(", "));
    await this.prisma.casbinRule.deleteMany({
      where: {
        ptype: data.ptype,
        v0: data.v0 ?? null,
        v1: data.v1 ?? null,
        v2: data.v2 ?? null,
        v3: data.v3 ?? null,
        v4: data.v4 ?? null,
        v5: data.v5 ?? null,
      },
    });
  }

  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const where: Record<string, unknown> = { ptype };
    const fields = ["v0", "v1", "v2", "v3", "v4", "v5"] as const;
    for (
      let i = fieldIndex;
      i < fields.length && i - fieldIndex < fieldValues.length;
      i++
    ) {
      const key = fields[i];
      where[key] = fieldValues[i - fieldIndex];
    }
    await this.prisma.casbinRule.deleteMany({ where: where as never });
  }

  private rowToLine(row: CasbinRule): string {
    const parts = [
      row.ptype,
      row.v0,
      row.v1,
      row.v2,
      row.v3,
      row.v4,
      row.v5,
    ].filter((v) => v !== null && v !== undefined && v !== "") as string[];
    return parts.join(", ");
  }

  private lineToRow(line: string): Omit<CasbinRule, "id"> {
    const parts = line
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const ptype = parts[0] ?? "";
    const [, v0, v1, v2, v3, v4, v5] = parts;
    return { ptype, v0, v1, v2, v3, v4, v5 };
  }
}
