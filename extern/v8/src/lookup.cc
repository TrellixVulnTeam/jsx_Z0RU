// Copyright 2014 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "src/v8.h"

#include "src/bootstrapper.h"
#include "src/lookup.h"

namespace v8 {
namespace internal {


void LookupIterator::Next() {
  has_property_ = false;
  do {
    state_ = LookupInHolder();
  } while (!IsFound() && NextHolder());
}


Handle<JSReceiver> LookupIterator::GetRoot() const {
  Handle<Object> receiver = GetReceiver();
  if (receiver->IsJSReceiver()) return Handle<JSReceiver>::cast(receiver);
  Handle<Object> root =
      handle(receiver->GetRootMap(isolate_)->prototype(), isolate_);
  CHECK(!root->IsNull());
  return Handle<JSReceiver>::cast(root);
}


Handle<Map> LookupIterator::GetReceiverMap() const {
  Handle<Object> receiver = GetReceiver();
  if (receiver->IsNumber()) return isolate_->factory()->heap_number_map();
  return handle(Handle<HeapObject>::cast(receiver)->map());
}


bool LookupIterator::NextHolder() {
  if (holder_map_->prototype()->IsNull()) return false;

  Handle<JSReceiver> next(JSReceiver::cast(holder_map_->prototype()));

  if (!check_derived() &&
      !(check_hidden() &&
         // TODO(verwaest): Check if this is actually necessary currently. If it
         // is, this should be handled by setting is_hidden_prototype on the
         // global object behind the proxy.
        (holder_map_->IsJSGlobalProxyMap() ||
         next->map()->is_hidden_prototype()))) {
    return false;
  }

  holder_map_ = handle(next->map());
  maybe_holder_ = next;
  return true;
}


LookupIterator::State LookupIterator::LookupInHolder() {
  switch (state_) {
    case NOT_FOUND:
      if (holder_map_->IsJSProxyMap()) {
        return JSPROXY;
      }
      if (check_access_check() && holder_map_->is_access_check_needed()) {
        return ACCESS_CHECK;
      }
      // Fall through.
    case ACCESS_CHECK:
      if (check_interceptor() && holder_map_->has_named_interceptor()) {
        return INTERCEPTOR;
      }
      // Fall through.
    case INTERCEPTOR:
      if (holder_map_->is_dictionary_map()) {
        property_encoding_ = DICTIONARY;
      } else {
        DescriptorArray* descriptors = holder_map_->instance_descriptors();
        number_ = descriptors->SearchWithCache(*name_, *holder_map_);
        if (number_ == DescriptorArray::kNotFound) return NOT_FOUND;
        property_encoding_ = DESCRIPTOR;
      }
      return PROPERTY;
    case PROPERTY:
      return NOT_FOUND;
    case JSPROXY:
      UNREACHABLE();
  }
  UNREACHABLE();
  return state_;
}


bool LookupIterator::IsBootstrapping() const {
  return isolate_->bootstrapper()->IsActive();
}


bool LookupIterator::HasAccess(v8::AccessType access_type) const {
  DCHECK_EQ(ACCESS_CHECK, state_);
  DCHECK(is_guaranteed_to_have_holder());
  return isolate_->MayNamedAccess(GetHolder<JSObject>(), name_, access_type);
}


bool LookupIterator::HasProperty() {
  DCHECK_EQ(PROPERTY, state_);
  DCHECK(is_guaranteed_to_have_holder());

  if (property_encoding_ == DICTIONARY) {
    Handle<JSObject> holder = GetHolder<JSObject>();
    number_ = holder->property_dictionary()->FindEntry(name_);
    if (number_ == NameDictionary::kNotFound) return false;

    property_details_ = holder->property_dictionary()->DetailsAt(number_);
    // Holes in dictionary cells are absent values.
    if (holder->IsGlobalObject() &&
        (property_details_.IsDeleted() || FetchValue()->IsTheHole())) {
      return false;
    }
  } else {
    // Can't use descriptor_number() yet because has_property_ is still false.
    property_details_ =
        holder_map_->instance_descriptors()->GetDetails(number_);
  }

  switch (property_details_.type()) {
    case v8::internal::FIELD:
    case v8::internal::NORMAL:
    case v8::internal::CONSTANT:
      property_kind_ = DATA;
      break;
    case v8::internal::CALLBACKS:
      property_kind_ = ACCESSOR;
      break;
    case v8::internal::HANDLER:
    case v8::internal::NONEXISTENT:
    case v8::internal::INTERCEPTOR:
      UNREACHABLE();
  }

  has_property_ = true;
  return true;
}


void LookupIterator::PrepareForDataProperty(Handle<Object> value) {
  DCHECK(has_property_);
  DCHECK(HolderIsReceiverOrHiddenPrototype());
  if (property_encoding_ == DICTIONARY) return;
  holder_map_ =
      Map::PrepareForDataProperty(holder_map_, descriptor_number(), value);
  JSObject::MigrateToMap(GetHolder<JSObject>(), holder_map_);
  // Reload property information.
  if (holder_map_->is_dictionary_map()) {
    property_encoding_ = DICTIONARY;
  } else {
    property_encoding_ = DESCRIPTOR;
  }
  CHECK(HasProperty());
}


void LookupIterator::TransitionToDataProperty(
    Handle<Object> value, PropertyAttributes attributes,
    Object::StoreFromKeyed store_mode) {
  DCHECK(!has_property_ || !HolderIsReceiverOrHiddenPrototype());

  // Can only be called when the receiver is a JSObject. JSProxy has to be
  // handled via a trap. Adding properties to primitive values is not
  // observable.
  Handle<JSObject> receiver = Handle<JSObject>::cast(GetReceiver());

  // Properties have to be added to context extension objects through
  // SetOwnPropertyIgnoreAttributes.
  DCHECK(!receiver->IsJSContextExtensionObject());

  if (receiver->IsJSGlobalProxy()) {
    PrototypeIterator iter(isolate(), receiver);
    receiver =
        Handle<JSGlobalObject>::cast(PrototypeIterator::GetCurrent(iter));
  }

  maybe_holder_ = receiver;
  holder_map_ = Map::TransitionToDataProperty(handle(receiver->map()), name_,
                                              value, attributes, store_mode);
  JSObject::MigrateToMap(receiver, holder_map_);

  // Reload the information.
  state_ = NOT_FOUND;
  configuration_ = CHECK_OWN_REAL;
  state_ = LookupInHolder();
  DCHECK(IsFound());
  HasProperty();
}


bool LookupIterator::HolderIsReceiverOrHiddenPrototype() const {
  DCHECK(has_property_ || state_ == INTERCEPTOR || state_ == JSPROXY);
  DisallowHeapAllocation no_gc;
  Handle<Object> receiver = GetReceiver();
  if (!receiver->IsJSReceiver()) return false;
  Object* current = *receiver;
  JSReceiver* holder = *maybe_holder_.ToHandleChecked();
  // JSProxy do not occur as hidden prototypes.
  if (current->IsJSProxy()) {
    return JSReceiver::cast(current) == holder;
  }
  PrototypeIterator iter(isolate(), current,
                         PrototypeIterator::START_AT_RECEIVER);
  do {
    if (JSReceiver::cast(iter.GetCurrent()) == holder) return true;
    DCHECK(!current->IsJSProxy());
    iter.Advance();
  } while (!iter.IsAtEnd(PrototypeIterator::END_AT_NON_HIDDEN));
  return false;
}


Handle<Object> LookupIterator::FetchValue() const {
  Object* result = NULL;
  Handle<JSObject> holder = GetHolder<JSObject>();
  switch (property_encoding_) {
    case DICTIONARY:
      result = holder->property_dictionary()->ValueAt(number_);
      if (holder->IsGlobalObject()) {
        result = PropertyCell::cast(result)->value();
      }
      break;
    case DESCRIPTOR:
      if (property_details_.type() == v8::internal::FIELD) {
        FieldIndex field_index =
            FieldIndex::ForDescriptor(*holder_map_, number_);
        return JSObject::FastPropertyAt(
            holder, property_details_.representation(), field_index);
      }
      result = holder_map_->instance_descriptors()->GetValue(number_);
  }
  return handle(result, isolate_);
}


FieldIndex LookupIterator::GetFieldIndex() const {
  DCHECK_EQ(PROPERTY, state_);
  int index =
      holder_map()->instance_descriptors()->GetFieldIndex(descriptor_number());
  bool is_double = representation().IsDouble();
  return FieldIndex::ForPropertyIndex(*holder_map(), index, is_double);
}


Handle<PropertyCell> LookupIterator::GetPropertyCell() const {
  Handle<JSObject> holder = GetHolder<JSObject>();
  Handle<GlobalObject> global = Handle<GlobalObject>::cast(holder);
  Object* value = global->property_dictionary()->ValueAt(dictionary_entry());
  return Handle<PropertyCell>(PropertyCell::cast(value));
}


Handle<Object> LookupIterator::GetAccessors() const {
  DCHECK(has_property_);
  DCHECK_EQ(ACCESSOR, property_kind_);
  return FetchValue();
}


Handle<Object> LookupIterator::GetDataValue() const {
  DCHECK(has_property_);
  DCHECK_EQ(DATA, property_kind_);
  Handle<Object> value = FetchValue();
  return value;
}


void LookupIterator::WriteDataValue(Handle<Object> value) {
  DCHECK(is_guaranteed_to_have_holder());
  DCHECK(has_property_);
  Handle<JSObject> holder = GetHolder<JSObject>();
  if (property_encoding_ == DICTIONARY) {
    NameDictionary* property_dictionary = holder->property_dictionary();
    if (holder->IsGlobalObject()) {
      Handle<PropertyCell> cell(
          PropertyCell::cast(property_dictionary->ValueAt(dictionary_entry())));
      PropertyCell::SetValueInferType(cell, value);
    } else {
      property_dictionary->ValueAtPut(dictionary_entry(), *value);
    }
  } else if (property_details_.type() == v8::internal::FIELD) {
    holder->WriteToField(descriptor_number(), *value);
  } else {
    DCHECK_EQ(v8::internal::CONSTANT, property_details_.type());
  }
}


void LookupIterator::InternalizeName() {
  if (name_->IsUniqueName()) return;
  name_ = factory()->InternalizeString(Handle<String>::cast(name_));
}
} }  // namespace v8::internal
