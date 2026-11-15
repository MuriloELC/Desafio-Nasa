import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FarmPage } from "./lavoura";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/cereja-shell", () => ({
  AppPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/lib/farm-client", () => ({
  useFarm: () => ({
    signedIn: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    request: mocks.request,
  }),
  farmConfig: () => Promise.resolve({ minha_lavoura: true }),
  savedAssessment: vi.fn(),
}));
vi.mock("@/lib/cereja-api", () => ({
  calendar: () =>
    Promise.resolve({
      year: 2026,
      months: [10, 11],
      today_month: 11,
      cultures: [{ culture_id: "cafe", name: "Café", kind: "cafe" }],
      rules: [],
    }),
}));

describe("Minha Lavoura: avaliação explícita", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.request.mockReset();
    mocks.request.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? {
              plots: [{ id: "plot-a", name: "Talhão A", lat: -11.44, lon: -61.45 }],
              cycles: [],
              tasks: [],
              assessments: [],
            }
          : { id: "assessment-a" },
      ),
    );
  });

  it("salva apenas após comando do produtor e envia pH local ausente como null", async () => {
    render(<FarmPage />);
    const section = screen.getByRole("heading", { name: "Avaliações salvas" }).closest("section");
    expect(section).not.toBeNull();
    await within(section!).findByRole("option", { name: "Talhão A" });
    expect(mocks.request.mock.calls.some(([path]) => path === "/avaliacoes")).toBe(false);
    const form = section!.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.change(form!.querySelector('select[name="plot_id"]')!, {
      target: { value: "plot-a" },
    });
    fireEvent.change(form!.querySelector('select[name="phase"]')!, {
      target: { value: "formacao" },
    });
    fireEvent.submit(form!);
    await waitFor(() =>
      expect(mocks.request.mock.calls.some(([path]) => path === "/avaliacoes")).toBe(true),
    );
    const call = mocks.request.mock.calls.find(([path]) => path === "/avaliacoes");
    expect(call?.[1]).toBe("POST");
    expect(call?.[2]).toMatchObject({
      plot_id: "plot-a",
      field: { phase: "formacao", soil_ph: null, spacing_m: null },
    });
  });
});
