#!/usr/bin/env python3
import json
import os
from typing import Dict, List, Any

# Define the model configurations
MODEL_CONFIGS = {
    "Exercise": {
        "permissions": {
            "create": ["EXERCISE.CREATE"],
            "read": ["EXERCISE.READ"],
            "update": ["EXERCISE.UPDATE"],
            "delete": ["EXERCISE.DELETE"]
        },
        "populate": ["createdBy", "organization", "mediaIds"],
        "searchFields": ["name", "description", "tags"],
        "filterFields": ["exerciseType", "difficulty", "muscleGroups", "equipment", "isArchived"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "Workout": {
        "permissions": {
            "create": ["WORKOUT.CREATE"],
            "read": ["WORKOUT.READ"],
            "update": ["WORKOUT.UPDATE"],
            "delete": ["WORKOUT.DELETE"]
        },
        "populate": ["createdBy", "organization", "mediaIds", "structure.exercises.exerciseId"],
        "searchFields": ["name", "description", "tags"],
        "filterFields": ["intensityLevel", "goal", "isTemplate", "isArchived"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "Program": {
        "permissions": {
            "create": ["PROGRAM.CREATE"],
            "read": ["PROGRAM.READ"],
            "update": ["PROGRAM.UPDATE"],
            "delete": ["PROGRAM.DELETE"]
        },
        "populate": ["createdBy", "organization", "mediaIds", "schedule.workoutId"],
        "searchFields": ["name", "description", "tags"],
        "filterFields": ["goal", "subgoals", "durationInWeeks", "isTemplate", "isArchived"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "Organization": {
        "permissions": {
            "create": ["ORGANIZATION.CREATE"],
            "read": ["ORGANIZATION.READ"],
            "update": ["ORGANIZATION.UPDATE"],
            "delete": ["ORGANIZATION.DELETE"]
        },
        "populate": ["owner", "admins", "members.user"],
        "searchFields": ["name", "description"],
        "filterFields": ["type", "visibility", "isActive", "isArchived"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "User": {
        "permissions": {
            "create": ["USER.CREATE"],
            "read": ["USER.READ"],
            "update": ["USER.UPDATE"],
            "delete": ["USER.DELETE"]
        },
        "populate": ["organizations.organization", "primaryOrganization", "activity", "favorite"],
        "searchFields": ["firstName", "lastName", "email"],
        "filterFields": ["role", "active"],
        "requireOrganization": False,
        "softDelete": False
    },
    
    "Media": {
        "permissions": {
            "create": ["MEDIA.CREATE"],
            "read": ["MEDIA.READ"],
            "update": ["MEDIA.UPDATE"],
            "delete": ["MEDIA.DELETE"]
        },
        "populate": ["user", "organization"],
        "searchFields": ["title", "description", "tags"],
        "filterFields": ["type", "category", "isArchived"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "Equipment": {
        "permissions": {
            "create": ["EQUIPMENT.CREATE"],
            "read": ["EQUIPMENT.READ"],
            "update": ["EQUIPMENT.UPDATE"],
            "delete": ["EQUIPMENT.DELETE"]
        },
        "populate": ["createdBy", "mediaIds", "relatedEquipment"],
        "searchFields": ["name", "description", "tags"],
        "filterFields": ["category", "isActive", "isArchived", "isPlatformEquipment"],
        "requireOrganization": False,
        "softDelete": True
    },
    
    "Activity": {
        "permissions": {
            "create": ["ACTIVITY.CREATE"],
            "read": ["ACTIVITY.READ"],
            "update": ["ACTIVITY.UPDATE"],
            "delete": ["ACTIVITY.DELETE"]
        },
        "populate": ["user", "subscribedWorkouts", "subscribedPrograms"],
        "searchFields": [],
        "filterFields": ["entries.targetModel", "entries.action"],
        "requireOrganization": False,
        "softDelete": False
    },
    
    "Favorite": {
        "permissions": {
            "create": ["FAVORITE.CREATE"],
            "read": ["FAVORITE.READ"],
            "update": ["FAVORITE.UPDATE"],
            "delete": ["FAVORITE.DELETE"]
        },
        "populate": ["user", "exercises", "workouts", "programs"],
        "searchFields": [],
        "filterFields": ["theme"],
        "requireOrganization": False,
        "softDelete": False
    }
}

def generate_typescript_config(model_name: str, config: Dict[str, Any]) -> str:
    """Generate TypeScript configuration for a model."""

    def format_array(arr: List[str]) -> str:
        return "[" + ", ".join(f"'{item}'" for item in arr) + "]"

    def format_permissions(perms: Dict[str, List[str]]) -> str:
        formatted = []
        for operation, perms_list in perms.items():
            formatted.append(f"    {operation}: {format_array(perms_list)}")
        return "{\n" + ",\n".join(formatted) + "\n  }"

    ts_config = f"""import {{ {model_name} }} from '@/lib/db/models';
import {{ HonoCrudConfig }} from '@/modules/api/core/types';
import {{ {model_name.lower()}Schemas }} from '@/lib/validation/schemas';

export const {model_name.lower()}Config: HonoCrudConfig = {{
  model: '{model_name}',
  permissions: {format_permissions(config['permissions'])},
  validation: {{
    create: {model_name.lower()}Schemas.create,
    update: {model_name.lower()}Schemas.update,
    query: {model_name.lower()}Schemas.query
  }},
  populate: {format_array(config['populate'])},
  searchFields: {format_array(config['searchFields'])},
  filterFields: {format_array(config['filterFields'])},
  requireOrganization: {str(config['requireOrganization']).lower()},
  softDelete: {str(config['softDelete']).lower()}
}};
"""
    return ts_config

def generate_route_file(model_name: str) -> str:
    """Generate route file for a model."""
    model_lower = model_name.lower()

    return f"""import {{ Hono }} from 'hono';
import {{ HonoApiFactory }} from '@/modules/api/core/factory';
import {{ {model_lower}Config }} from '../config/{model_lower}';
import {{ {model_name} }} from '@/lib/db/models';

const {model_lower}Routes = new Hono();

// Create CRUD handlers
const handlers = HonoApiFactory.createHonoCrud({model_name}, {model_lower}Config);

// Define routes
{model_lower}Routes.get('/', handlers.list);
{model_lower}Routes.post('/', handlers.create);
{model_lower}Routes.get('/:id', handlers.read);
{model_lower}Routes.put('/:id', handlers.update);
{model_lower}Routes.delete('/:id', handlers.delete);

export default {model_lower}Routes;
"""

def generate_index_file(models: List[str]) -> str:
    return "\n".join([f"export {{ {model.lower()}Config }} from './{model.lower()}';" for model in models])

def main():
    os.makedirs("generated/config", exist_ok=True)
    os.makedirs("generated/routes", exist_ok=True)

    print("Generating configuration files...")

    for model_name, config in MODEL_CONFIGS.items():
        ts_config = generate_typescript_config(model_name, config)
        config_path = f"generated/config/{model_name.lower()}.ts"
        with open(config_path, "w") as f:
            f.write(ts_config)
        print(f"Generated: {config_path}")

        route_ts = generate_route_file(model_name)
        route_path = f"generated/routes/{model_name.lower()}.ts"
        with open(route_path, "w") as f:
            f.write(route_ts)
        print(f"Generated: {route_path}")

    models = list(MODEL_CONFIGS.keys())

    config_index = generate_index_file(models)
    with open("generated/config/index.ts", "w") as f:
        f.write(config_index)
    print("Generated: generated/config/index.ts")

    route_imports = [f"import {model.lower()}Routes from './{model.lower()}';" for model in models]
    route_exports = [f"export {{ default as {model.lower()}Routes }} from './{model.lower()}';" for model in models]
    routes_index = "\n".join(route_imports) + "\n\n" + "\n".join(route_exports)

    with open("generated/routes/index.ts", "w") as f:
        f.write(routes_index)
    print("Generated: generated/routes/index.ts")

    summary = {
        "generated_files": len(models) * 2 + 2,
        "models": models,
        "timestamp": "Generated via Python script"
    }

    with open("generated/summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n✅ Generated {summary['generated_files']} files for {len(models)} models")
    print("\nMove the generated files to:")
    print("- generated/config/* → api/config/")
    print("- generated/routes/* → api/routes/")

if __name__ == "__main__":
    main()
