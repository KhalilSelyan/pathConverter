import { ExtensionContext } from "@foxglove/studio";
import {
  // CubePrimitive,
  Point3,
  SceneUpdate,
  TriangleListPrimitive,
} from "@foxglove/schemas";
import { Pose } from "@foxglove/schemas/schemas/typescript/Pose";
import { Time } from "@foxglove/schemas/schemas/typescript/Time";
import { setColorDependsOnVelocity } from "./utils";

export interface PathPoint {
  /**
   * @description Represents a pose from a lanelet map, contains twist information.
   */

  pose: Pose;
  longitudinal_velocity_mps: number;
  lateral_velocity_mps: number;
  heading_rate_rps: number;
  is_final: boolean;
}

export interface Path {
  /**
   * @description Contains a PathPoint path and an OccupancyGrid of drivable_area.
   */
  header: {
    stamp: Time;
    frame_id: string;
  };
  points: PathPoint[];
  left_bound: Point3[];
  right_bound: Point3[];
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "autoware_auto_planning_msgs/msg/Path",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (msg: Path): SceneUpdate => {
      const { points, left_bound, right_bound } = msg;

      const triangleList: TriangleListPrimitive = {
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: [],
        color: { r: 0, g: 0, b: 0, a: 0 },
        colors: [],
        indices: [],
      };

      // Create rectangles for the path
      for (let i = 0; i < left_bound.length - 1; i++) {
        // Corresponding points on the left and right bounds
        const leftPoint1 = left_bound[i]!;
        const leftPoint2 = left_bound[i + 1]!;
        const rightPoint1 = right_bound[i]!;
        const rightPoint2 = right_bound[i + 1]!;

        // Add points to the triangle list
        triangleList.points.push(leftPoint1, rightPoint1, leftPoint2, rightPoint2);

        // Add colors for each point
        const color1 = setColorDependsOnVelocity(8.33, points[i]!.longitudinal_velocity_mps);
        const color2 = setColorDependsOnVelocity(8.33, points[i + 1]!.longitudinal_velocity_mps);
        triangleList.colors.push(color1, color1, color2, color2);

        // Add indices for two triangles: (leftPoint1, rightPoint1, leftPoint2) and (leftPoint2, rightPoint1, rightPoint2)
        const baseIndex = i * 4;
        triangleList.indices.push(
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex + 2,
          baseIndex + 1,
          baseIndex + 3,
        );
      }

      const sceneUpdate: SceneUpdate = {
        deletions: [],
        entities: [
          {
            id: "path",
            arrows: [],
            lines: [],
            cubes: [],
            spheres: [],
            cylinders: [],
            models: [],
            texts: [],
            triangles: [triangleList],
            timestamp: msg.header.stamp,
            frame_id: msg.header.frame_id,
            frame_locked: false,
            lifetime: {
              sec: 1,
              nsec: 0,
            },
            metadata: [],
          },
        ],
      };
      return sceneUpdate;
    },
  });
}
