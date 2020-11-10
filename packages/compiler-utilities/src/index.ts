import * as ts from "typescript";
import {
  pipe,
  anyPass,
  propEq,
  is,
  map,
  toPairs,
  equals,
  propSatisfies,
  mapObjIndexed,
} from "ramda";

export const addPropertyAccessToIdentifier = (
  property: ts.Identifier | ts.PrivateIdentifier
) => (identifier: ts.Expression) =>
  ts.createPropertyAccess(identifier, property);

export const createCall = (
  typeArguments: readonly ts.TypeNode[],
  argumentsArray: readonly ts.Expression[]
) => (expression: ts.Expression) =>
  ts.createCall(expression, typeArguments, argumentsArray);

export const addMethodCallToExpression = (
  methodName: string,
  typeArguments: readonly ts.TypeNode[],
  argumentsArray: readonly ts.Expression[] = []
) => (identifier: ts.Expression) =>
  pipe(
    () => identifier,
    addPropertyAccessToIdentifier(ts.factory.createIdentifier(methodName)),
    createCall([], [])
  )();

export const mergeObjectLiteralsRecursivelyLeft = (
  objectLiteralA: ts.ObjectLiteralExpression,
  objectLiteralB: ts.ObjectLiteralExpression
): ts.ObjectLiteralExpression => {
  if (objectLiteralA.properties.length === 0) {
    return objectLiteralB;
  }
  if (objectLiteralB.properties.length === 0) {
    return objectLiteralA;
  }
  return ts.factory.updateObjectLiteralExpression(objectLiteralA, [
    ...map(
      (property: ts.ObjectLiteralElementLike): ts.PropertyAssignment => {
        if (ts.isPropertyAssignment(property)) {
          const correspondingItem = objectLiteralA.properties.find(
            (node: ts.Node) => {
              const propertyAssignment = node as ts.PropertySignature;
              return (
                (propertyAssignment.name as ts.Identifier).escapedText ===
                (property.name as ts.Identifier).escapedText
              );
            }
          ) as ts.PropertyAssignment;
          const initializer = property.initializer;
          if (
            correspondingItem &&
            ts.isObjectLiteralExpression(initializer) &&
            ts.isObjectLiteralExpression(correspondingItem.initializer)
          ) {
            const res = mergeObjectLiteralsRecursivelyLeft(
              correspondingItem.initializer,
              initializer
            );
            return ts.factory.createPropertyAssignment(property.name, res);
          }
          if (
            correspondingItem &&
            ts.isArrayLiteralExpression(initializer) &&
            ts.isArrayLiteralExpression(correspondingItem.initializer)
          ) {
            return ts.factory.createPropertyAssignment(
              property.name,
              ts.factory.createArrayLiteralExpression([
                ...correspondingItem.initializer.elements,
                ...initializer.elements,
              ])
            );
          }
          return property;
        }
        return (property as unknown) as ts.PropertyAssignment;
      }
    )(objectLiteralB.properties),
    ...map(
      (property: ts.ObjectLiteralElementLike): ts.PropertyAssignment => {
        if (ts.isPropertyAssignment(property)) {
          const correspondingItem = objectLiteralB.properties.find(
            (node: ts.Node) => {
              const propertyAssignment = node as ts.PropertySignature;
              return (
                (propertyAssignment.name as ts.Identifier).escapedText ===
                (property.name as ts.Identifier).escapedText
              );
            }
          ) as ts.PropertyAssignment;
          if (!correspondingItem) {
            return property;
          }
        }
        return undefined;
      }
    )(objectLiteralA.properties).filter((property) => property),
  ]);
};

export const findRootIdentifier = (
  identifier: ts.Identifier,
  checker: ts.TypeChecker
): ts.Identifier => {
  const symbol = checker.getSymbolAtLocation(identifier);
  const declaration = symbol.declarations[0];

  if (ts.isTypeAliasDeclaration(declaration)) {
    if (
      ts.isTypeReferenceNode(declaration.type) &&
      ts.isIdentifier(declaration.type.typeName)
    ) {
      return findRootIdentifier(declaration.type.typeName, checker);
    }
    return declaration.name;
  }
  if (ts.isVariableDeclaration(declaration)) {
    const initializer = declaration.initializer;
    if (!initializer) {
      return identifier;
    }
    if (ts.isIdentifier(initializer)) {
      return findRootIdentifier(initializer, checker);
    }
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return declaration.name;
  }
  if (ts.isImportClause(declaration)) {
    // TODO: Remove this ugly hack
    if (!declaration.getText().includes("is")) {
      const parent = declaration.parent;
      if (ts.isImportDeclaration(parent)) {
        const moduleSymbol = checker.getSymbolAtLocation(
          declaration.parent.moduleSpecifier
        );
        const defaultExport = moduleSymbol.exports.get(
          ts.escapeLeadingUnderscores("default")
        );
        const expressionA = (defaultExport
          .declarations[0] as ts.ExportAssignment).expression as ts.Identifier;
        return findRootIdentifier(expressionA, checker);
      }
    }
    return (declaration && declaration.name) || identifier;
  }
  if (ts.isImportSpecifier(declaration)) {
    const importDeclaration = declaration.parent.parent.parent;
    // TODO: Remove this ugly hack
    if (!importDeclaration.getText().includes("is")) {
      if (ts.isImportDeclaration(importDeclaration)) {
        const moduleSymbol = checker.getSymbolAtLocation(
          importDeclaration.moduleSpecifier
        );
        const defaultExport = moduleSymbol.exports.get(
          ts.escapeLeadingUnderscores("default")
        );
        const expressionA = (defaultExport
          .declarations[0] as ts.ExportAssignment).expression as ts.Identifier;
        return findRootIdentifier(expressionA, checker);
      }
    }
    return (declaration && declaration.name) || identifier;
  }
  return identifier;
};

export const createArrayLiteralFrom = (
  array: unknown[],
  multiLine?: boolean
): ts.ArrayLiteralExpression => {
  return ts.factory.createArrayLiteralExpression(
    map((item) =>
      is(Array)(item)
        ? createArrayLiteralFrom(item as unknown[], multiLine)
        : isNode(item) &&
          (ts.isStringLiteral(item) ||
            ts.isObjectLiteralExpression(item) ||
            ts.isNumericLiteral(item))
        ? item
        : is(Object)(item)
        ? createObjectLiteralFrom(item as Record<string, unknown>)
        : is(Number)(item)
        ? ts.factory.createNumericLiteral(item as string)
        : item
    )(array) as ts.Expression[],
    multiLine
  );
};

export const createObjectLiteralFrom = (
  object: Record<string, unknown>,
  multiLine?: boolean
): ts.ObjectLiteralExpression => {
  return ts.factory.createObjectLiteralExpression(
    map(
      ([key, value]): ts.PropertyAssignment => {
        return ts.factory.createPropertyAssignment(
          key,
          (isNode(value) && ts.isObjectLiteralExpression(value)) ||
            ts.isArrayLiteralExpression(value) ||
            ts.isStringLiteral(value) || ts.isNumericLiteral(value)
            ? value
            : is(Array)(value)
            ? createArrayLiteralFrom(value, multiLine)
            : is(Object)(value)
            ? createObjectLiteralFrom(value, multiLine)
            : is(String)(value)
            ? ts.factory.createStringLiteral(value, true)
            : is(Number)(value)
            ? ts.factory.createNumericLiteral(value)
            : equals(value, true)
            ? ts.factory.createTrue()
            : equals(value, false)
            ? ts.factory.createFalse()
            : value
        );
      }
    )(toPairs(object)),
    multiLine
  );
};

export const isNode = (node: unknown): node is ts.Node => {
  if (!is(Object)(node)) {
    return false;
  }
  if (propSatisfies(is(Number), "kind")(node)) {
    return true;
  }
  return false;
};

export const isKeyword = (node: ts.Node): boolean => {
  return anyPass([
    propEq("kind", ts.SyntaxKind.BreakKeyword),
    propEq("kind", ts.SyntaxKind.CaseKeyword),
    propEq("kind", ts.SyntaxKind.CatchKeyword),
    propEq("kind", ts.SyntaxKind.ClassKeyword),
    propEq("kind", ts.SyntaxKind.ConstKeyword),
    propEq("kind", ts.SyntaxKind.ContinueKeyword),
    propEq("kind", ts.SyntaxKind.DebuggerKeyword),
    propEq("kind", ts.SyntaxKind.DefaultKeyword),
    propEq("kind", ts.SyntaxKind.DeleteKeyword),
    propEq("kind", ts.SyntaxKind.DoKeyword),
    propEq("kind", ts.SyntaxKind.ElseKeyword),
    propEq("kind", ts.SyntaxKind.EnumKeyword),
    propEq("kind", ts.SyntaxKind.ExportKeyword),
    propEq("kind", ts.SyntaxKind.ExtendsKeyword),
    propEq("kind", ts.SyntaxKind.FalseKeyword),
    propEq("kind", ts.SyntaxKind.FinallyKeyword),
    propEq("kind", ts.SyntaxKind.ForKeyword),
    propEq("kind", ts.SyntaxKind.FunctionKeyword),
    propEq("kind", ts.SyntaxKind.IfKeyword),
    propEq("kind", ts.SyntaxKind.ImportKeyword),
    propEq("kind", ts.SyntaxKind.InKeyword),
    propEq("kind", ts.SyntaxKind.InstanceOfKeyword),
    propEq("kind", ts.SyntaxKind.NewKeyword),
    propEq("kind", ts.SyntaxKind.NullKeyword),
    propEq("kind", ts.SyntaxKind.ReturnKeyword),
    propEq("kind", ts.SyntaxKind.SuperKeyword),
    propEq("kind", ts.SyntaxKind.SwitchKeyword),
    propEq("kind", ts.SyntaxKind.ThisKeyword),
    propEq("kind", ts.SyntaxKind.ThrowKeyword),
    propEq("kind", ts.SyntaxKind.TrueKeyword),
    propEq("kind", ts.SyntaxKind.TryKeyword),
    propEq("kind", ts.SyntaxKind.TypeOfKeyword),
    propEq("kind", ts.SyntaxKind.VarKeyword),
    propEq("kind", ts.SyntaxKind.VoidKeyword),
    propEq("kind", ts.SyntaxKind.WhileKeyword),
    propEq("kind", ts.SyntaxKind.WithKeyword),
    propEq("kind", ts.SyntaxKind.ImplementsKeyword),
    propEq("kind", ts.SyntaxKind.InterfaceKeyword),
    propEq("kind", ts.SyntaxKind.LetKeyword),
    propEq("kind", ts.SyntaxKind.PackageKeyword),
    propEq("kind", ts.SyntaxKind.PrivateKeyword),
    propEq("kind", ts.SyntaxKind.ProtectedKeyword),
    propEq("kind", ts.SyntaxKind.PublicKeyword),
    propEq("kind", ts.SyntaxKind.StaticKeyword),
    propEq("kind", ts.SyntaxKind.YieldKeyword),
    propEq("kind", ts.SyntaxKind.AbstractKeyword),
    propEq("kind", ts.SyntaxKind.AsKeyword),
    propEq("kind", ts.SyntaxKind.AssertsKeyword),
    propEq("kind", ts.SyntaxKind.AnyKeyword),
    propEq("kind", ts.SyntaxKind.AsyncKeyword),
    propEq("kind", ts.SyntaxKind.AwaitKeyword),
    propEq("kind", ts.SyntaxKind.BooleanKeyword),
    propEq("kind", ts.SyntaxKind.ConstructorKeyword),
    propEq("kind", ts.SyntaxKind.DeclareKeyword),
    propEq("kind", ts.SyntaxKind.GetKeyword),
    propEq("kind", ts.SyntaxKind.InferKeyword),
    propEq("kind", ts.SyntaxKind.IsKeyword),
    propEq("kind", ts.SyntaxKind.KeyOfKeyword),
    propEq("kind", ts.SyntaxKind.ModuleKeyword),
    propEq("kind", ts.SyntaxKind.NamespaceKeyword),
    propEq("kind", ts.SyntaxKind.NeverKeyword),
    propEq("kind", ts.SyntaxKind.ReadonlyKeyword),
    propEq("kind", ts.SyntaxKind.RequireKeyword),
    propEq("kind", ts.SyntaxKind.NumberKeyword),
    propEq("kind", ts.SyntaxKind.ObjectKeyword),
    propEq("kind", ts.SyntaxKind.SetKeyword),
    propEq("kind", ts.SyntaxKind.StringKeyword),
    propEq("kind", ts.SyntaxKind.SymbolKeyword),
    propEq("kind", ts.SyntaxKind.TypeKeyword),
    propEq("kind", ts.SyntaxKind.UndefinedKeyword),
    propEq("kind", ts.SyntaxKind.UniqueKeyword),
    propEq("kind", ts.SyntaxKind.UnknownKeyword),
    propEq("kind", ts.SyntaxKind.FromKeyword),
    propEq("kind", ts.SyntaxKind.GlobalKeyword),
    propEq("kind", ts.SyntaxKind.BigIntKeyword),
    propEq("kind", ts.SyntaxKind.OfKeyword),
    propEq("kind", ts.SyntaxKind.FirstKeyword),
    propEq("kind", ts.SyntaxKind.LastKeyword),
  ])(node);
};
