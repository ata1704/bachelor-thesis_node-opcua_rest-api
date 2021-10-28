const {DataTypeIds, AttributeIds} = require("node-opcua");

/** @see https://reference.opcfoundation.org/v104/Core/docs/Part3/ for the structure of the attributes
 *  The Attributes that are commented out yet have to be implemented.
 */

// InverseName
// ArrayDimensions
// RolePermissions
// UserRolePermissions

/** @see:  https://reference.opcfoundation.org/v104/Core/docs/Part3/8.51/ */
module.exports.ValueRank = function ValueRank(val) {
    if (val > 1) return `Array (${val} dimensions)`;
    else if (val === 1) return `Array (1 dimension)`;
    else if (val === 0) return `Array (>=1 dimensions)`;
    else if (val === -1) return `Scalar`;
    else if (val === -2) return `Scalar or Array (>=1 dimensions)`;
    else if (val === -3) return `Scalar or Array (1 dimension)`;
    else return "";
};

/** This Method is for the ArrayType used in Variants (NodeOPCUA). The ArrayType is based von ValueRank. */
module.exports.arrayType = function arrayType(val) {
    if (val === 1 || val === -2 || val === -3) return "Array";
    else if (val >= 0) return "Matrix";
    else if (val === -1) return "Scalar";
    else return null;
};


module.exports.DataTypeIdsToString = invert(DataTypeIds);
module.exports.AttributeIdToString = invert(AttributeIds);

function invert(o) {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
        r[v.toString()] = k;
    }
    return r;
}

/** @see: https://reference.opcfoundation.org/v104/Core/DataTypes/EventNotifierType/ */
module.exports.EventNotifier = function EventNotifier(val) {
    if (!val) {
        return "None";
    }
    return [(val & 2 ** 0 ? "SubscribeToEvents" : null),
        (val & 2 ** 2 ? "HistoryRead" : null),
        (val & 2 ** 3 ? "HistoryWrite" : null)].filter(Boolean);
};

/** AccessLevelEx bit mask is the extended version of AccessLevel.
 *  @see: https://reference.opcfoundation.org/v104/Core/DataTypes/AccessLevelExType/
 */
module.exports.AccessLevel = function AccessLevel(val) {
    if (!val) {
        return "None";
    }
    return [(val & 2 ** 0 ? "CurrentRead" : null),
        (val & 2 ** 1 ? "CurrentWrite" : null),
        (val & 2 ** 2 ? "HistoryRead" : null),
        (val & 2 ** 3 ? "HistoryWrite" : null),
        (val & 2 ** 4 ? "SemanticChange" : null),
        (val & 2 ** 5 ? "StatusWrite" : null),
        (val & 2 ** 6 ? "TimestampWrite" : null),
        (val & 2 ** 8 ? "NonatomicRead" : null),
        (val & 2 ** 9 ? "NonatomicWrite" : null),
        (val & 2 ** 10 ? "WriteFullArrayOnly" : null),
    ].filter(Boolean);
};

/** @see: https://reference.opcfoundation.org/v104/Core/docs/Part3/5.6.2/ */
module.exports.MinimumSamplingInterval = function MinimumSamplingInterval(val) {
    if (val === -1) return "indeterminate";
    else if (val === 0) return "continuously";
    else return val;
};

/** @see: https://reference.opcfoundation.org/v104/Core/DataTypes/AccessRestrictionType/ */
module.exports.AccessRestrictions = function AccessRestrictions(val) {
    if (!val) {
        return "None";
    }
    return [(val & 2 ** 0 ? "SigningRequired" : null),
        (val & 2 ** 1 ? "EncryptionRequired" : null),
        (val & 2 ** 2 ? "SessionRequired" : null)
    ].filter(Boolean);
};

/** @see: https://reference.opcfoundation.org/v104/Core/DataTypes/AttributeWriteMask/ */
module.exports.AttributeWriteMask = function AttributeWriteMask(val) {
    if (!val) {
        return "None";
    }
    return [(val & 2 ** 0 ? "AccessLevel" : null),
        (val & 2 ** 1 ? "ArrayDimensions" : null),
        (val & 2 ** 2 ? "BrowseName" : null),
        (val & 2 ** 3 ? "ContainsNoLoops" : null),
        (val & 2 ** 4 ? "DataType" : null),
        (val & 2 ** 5 ? "Description" : null),
        (val & 2 ** 6 ? "DisplayName" : null),
        (val & 2 ** 7 ? "EventNotifier" : null),
        (val & 2 ** 8 ? "Executable" : null),
        (val & 2 ** 9 ? "Historizing" : null),
        (val & 2 ** 10 ? "InverseName" : null),
        (val & 2 ** 11 ? "IsAbstract" : null),
        (val & 2 ** 12 ? "MinimumSamplingInterval" : null),
        (val & 2 ** 13 ? "NodeClass" : null),
        (val & 2 ** 14 ? "NodeId" : null),
        (val & 2 ** 15 ? "Symmetric" : null),
        (val & 2 ** 16 ? "UserAccessLevel" : null),
        (val & 2 ** 17 ? "UserExecutable" : null),
        (val & 2 ** 18 ? "UserWriteMask" : null),
        (val & 2 ** 19 ? "ValueRank" : null),
        (val & 2 ** 20 ? "WriteMask" : null),
        (val & 2 ** 21 ? "ValueForVariableType" : null),
        (val & 2 ** 22 ? "DataTypeDefinition" : null),
        (val & 2 ** 23 ? "RolePermissions" : null),
        (val & 2 ** 24 ? "AccessRestrictions" : null),
        (val & 2 ** 25 ? "AccessLevelEx" : null),
    ].filter(Boolean);
};

module.exports.LocalText = function LocalText(val) {
    if (!val) {
        return "None";
    }
    return {
        "locale": val.locale ? val.locale : "None",
        "text": val.text ? val.text : "None",
    };
};