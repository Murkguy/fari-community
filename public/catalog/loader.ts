import startCase from "lodash/startCase";
import path from "path";

export const loader = {
  async getCreatorData(creatorSlug: string): Promise<ICreator> {
    const fs = await import("fs/promises");
    const files = await fs.readdir(
      path.join(process.cwd(), "public", "catalog", "creators"),
      { withFileTypes: true }
    );
    const folders = files.filter((f) => f.isDirectory());

    const creatorFolder = folders.find((f) => f.name === creatorSlug);
    if (!creatorFolder) {
      throw new Error(`Creator '${creatorSlug}' not found`);
    }
    let data: ICreatorData | undefined = undefined;
    try {
      const creatorDataLoader: ILoaderFunction<ICreatorData> = await import(
        `./creators/${creatorFolder.name}/index.ts`
      );
      data = creatorDataLoader?.default();
      data.description =
        data.description ||
        `Find ton of free and open licensed content by ${data?.name} right here, on Fari Community`;
    } catch (error) {}
    const name: string = data?.name || startCase(creatorSlug);
    const projects = await this.getCreatorProjects(creatorSlug);
    return {
      creatorSlug: creatorSlug,
      projects: projects,
      data: {
        name: name,
        ...data,
      },
    };
  },
  async getAllCreators() {
    const fs = await import("fs/promises");

    const files = await fs.readdir(
      path.join(process.cwd(), "public", "catalog", "creators"),
      { withFileTypes: true }
    );
    const folders = files.filter((f) => f.isDirectory());
    const result = await Promise.all(
      folders.map(async (folder) => {
        return this.getCreatorData(folder.name);
      })
    );
    return result;
  },

  async getCreatorProjects(creatorSlug: string): Promise<Array<IProject>> {
    const fs = await import("fs/promises");
    const files = await fs.readdir(
      path.join(process.cwd(), "public", "catalog", "creators", creatorSlug),
      { withFileTypes: true }
    );
    const folders = files.filter((f) => f.isDirectory());
    const result = await Promise.all(
      folders.map(async (folder) => {
        return this.getProjectData(creatorSlug, folder.name);
      })
    );
    return result;
  },
  async getProjectData(creatorSlug: string, projectSlug: string) {
    const [slug, language] = projectSlug.split(".");
    const fs = await import("fs/promises");
    // load image
    let image: string | undefined = await this.getProjectImage(
      creatorSlug,
      projectSlug
    );
    // load project
    let data: IProjectData | undefined = undefined;
    try {
      const projectDataLoader: ILoaderFunction<IProjectData> = await import(
        `./creators/${creatorSlug}/${slug}/index.ts`
      );
      data = projectDataLoader?.default();
    } catch (error) {}
    // load other languages
    const files = await fs.readdir(
      path.join(
        process.cwd(),
        "public",
        "catalog",
        "creators",
        creatorSlug,
        slug
      ),
      { withFileTypes: true }
    );
    const otherLanguages = files
      .filter((f) => f.name.endsWith(".md") && f.name !== "index.md")
      .map((f) => f.name.replace(".md", ""));

    const name: string = data?.name || startCase(projectSlug);
    return {
      projectSlug: projectSlug,
      image: image,
      data: {
        name: name,
        language: language,
        otherLanguages: otherLanguages,
        ...data,
      },
    };
  },
  async getProjectImage(creatorSlug: string, projectSlug: string) {
    const fs = await import("fs/promises");
    const [slug, language] = projectSlug.split(".");
    let image: string | undefined = undefined;
    try {
      const pngFile = await fs.readFile(
        path.join(
          process.cwd(),
          "public",
          "catalog",
          "creators",
          creatorSlug,
          slug,
          "image.png"
        )
      );
      if (!!pngFile) {
        image = `/catalog/creators/${creatorSlug}/${slug}/image.png`;
      }
    } catch (error) {}
    try {
      const jpgFile = await fs.readFile(
        path.join(
          process.cwd(),
          "public",
          "catalog",
          "creators",
          creatorSlug,
          slug,
          "image.jpg"
        )
      );
      if (!!jpgFile) {
        image = `/catalog/creators/${creatorSlug}/${slug}/image.jpg`;
      }
    } catch (error) {}

    return image;
  },
  async getProjectMarkdown(creatorSlug: string, projectSlug: string) {
    const [slug, language] = projectSlug.split(".");
    const fs = await import("fs/promises");
    const directory = path.join(
      process.cwd(),
      "public",
      "catalog",
      "creators",
      creatorSlug,
      slug,
      language ? `${language}.md` : "index.md"
    );

    const fileBuffer = await fs.readFile(directory);
    const fileContent = fileBuffer.toString();
    return fileContent;
  },
};

export type ICreatorData = {
  name: string;
  description?: string;
  links?: Record<string, string>;
};

export type ICreator = {
  creatorSlug: string;
  projects: Array<IProject>;
  data: ICreatorData | undefined;
};

export type IProjectData = {
  name: string;
  description?: string;
  links?: Record<string, string>;
  fonts?: Array<string>;
  headingFont?: string;
  textFont?: string;
  headingUppercase?: boolean;
  css?: string;
};

export type IProject = {
  projectSlug: string;
  image?: string;
  data: IProjectData | undefined;
};

export type ILoaderFunction<T> = { default: () => T };

export enum License {
  Reserved = "All Rights Reserved",
  CC_BY_3 = "CC BY 3.0",
  CC_BY_4 = "CC BY 4.0",
}
