import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { createContentRenderEngine } from "../../../Composition/createContentRenderEngine";
import { GetAboutPageRequest } from "../Requests/GetAboutPageRequest";
import { AboutPageResponse } from "../Responses/AboutPageResponse";
import { GetAboutPageHandler } from "./GetAboutPageHandler";

function handlerFor(aboutMd: string): GetAboutPageHandler {
  const state = new FakeSiteConfigState("anyone", "anyone");
  state.siteIdentity = { siteName: "The Wren House", siteTagline: "", aboutMd };
  return new GetAboutPageHandler(
    fakeSiteConfigAccessor(state),
    createContentRenderEngine({}),
  );
}

describe("GetAboutPageHandler", () => {
  test("renders the admin's markdown as formatting", async () => {
    const response = await handlerFor(
      "## Who we are\n\nWe are **neighbors**.\n\n- one\n- two\n\n[Code](https://example.com)",
    ).handle(new GetAboutPageRequest());

    expect(response).toBeInstanceOf(AboutPageResponse);
    const { aboutHtml } = response as AboutPageResponse;
    expect(aboutHtml).toContain("<h2>Who we are</h2>");
    expect(aboutHtml).toContain("<strong>neighbors</strong>");
    expect(aboutHtml).toContain("<li>one</li>");
    expect(aboutHtml).toContain('href="https://example.com"');
  });

  test("raw HTML in the markdown never becomes markup", async () => {
    const response = await handlerFor('<script>alert("x")</script>').handle(
      new GetAboutPageRequest(),
    );

    expect((response as AboutPageResponse).aboutHtml).not.toContain("<script");
  });

  test("the sanitizer drops a script link that the markdown parser keeps", async () => {
    const response = await handlerFor("[click](javascript:alert(1))").handle(
      new GetAboutPageRequest(),
    );

    expect((response as AboutPageResponse).aboutHtml).not.toContain("javascript:");
  });

  test("an empty about page renders as empty", async () => {
    const response = await handlerFor("  \n").handle(new GetAboutPageRequest());

    expect(response).toMatchObject({ aboutHtml: "" });
  });
});
