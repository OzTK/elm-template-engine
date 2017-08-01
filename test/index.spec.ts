import "mocha";
// import * as should from "should";
import "should";

import * as express from "express";
import * as path from "path";
import { stub } from "sinon";

import { __express, configure, ElmViewEngine, Options, reset } from "../src";
import MockProjectHelper from "./mock-project-helper";

describe("module entry point", () => {
  let mockProject: MockProjectHelper;
  let engineStub: ElmViewEngine;

  before(async () => {
    mockProject = await MockProjectHelper.createProject(
      path.join(__dirname, "fixtures"),
    );

    engineStub = new ElmViewEngine(
      new Options(mockProject.viewsPath, mockProject.projectPath),
    );
    stubEngine(engineStub);
  });

  after(() => {
    return mockProject.deleteProject();
  });

  describe("#configure", () => {
    it("throws to configure if options are not valid", () => {
      return configure().should.be.rejected();
    });

    it("returns a view engine", () => {
      return configure(engineStub).should.eventually.have.properties("compile", "getView");
    });

    it("doesn't fail if a wrong express app is passed", () => {
      // Prepare
      const customEngine = stubEngine(
        new ElmViewEngine(
          new Options(mockProject.viewsPath, mockProject.projectPath, {
            anything: "pointless",
          }),
        ),
      );

      // Test/Assert
      return configure(customEngine).should.eventually.have.properties("compile", "getView");
    });

    it("configures express app if passed", async () => {
      // Prepare
      const app = express();
      let isEngineSet: boolean = false;
      stub(app, "engine").callsFake(() => {
        isEngineSet = true;
      });
      const customEngine = stubEngine(
        new ElmViewEngine(
          new Options(mockProject.viewsPath, mockProject.projectPath, app),
        ),
      );

      // Test
      const eng = await configure(customEngine);

      // Assert
      eng.should.have.properties("compile", "getView");
      app.get("views").should.be.equal(mockProject.viewsPath);
      app.get("view engine").should.be.equal("elm");
      isEngineSet.should.be.true();
    });
  });

  describe("#__express", () => {
    before(() => {
      reset();
    });

    it("fails if the engine instance was not configured prior to the call", () => {
      return __express(
        path.join(mockProject.viewsPath, "UsersView"),
        {},
        () => true,
      ).should.be.rejectedWith(
        "configure() must be called before trying to call __express()",
      );
    });

    it("returns the engine result", async () => {
      // Prepare
      await configure(engineStub);

      // Test/Assert
      return __express(
        path.join(mockProject.viewsPath, "HasContextView"),
        "paul",
        () => true,
      ).should.eventually.be.a
        .String()
        .and.containEql("paul");
    });
  });

  describe("#reset", () => {
    it("forces the engine to be reconfigured", async () => {
      // Prepare
      await configure(engineStub);

      // Test
      const success = reset();

      // Assert
      success.should.be.true();
      return __express("anything.elm", {}, () => true).should.be.rejectedWith(
        "configure() must be called before trying to call __express()",
      );
    });

    it("fails to reset if the engine is compiling", async () => {
      // Prepare
      configure(engineStub);

      // Test/Assert
      reset().should.be.false();
    });
  });
});

function stubEngine(engine: ElmViewEngine) {
  stub(engine, "compile").returns(new Promise(resolve => resolve()));
  stub(engine, "getView").callsFake((viewName: string, context?: any) => {
    viewName.toString();
    return new Promise(resolve => resolve(context));
  });
  return engine;
}
