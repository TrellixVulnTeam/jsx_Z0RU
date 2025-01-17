// Copyright 2013 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

#include <cstdlib>

#include "src/v8.h"

#include "src/base/platform/mutex.h"
#include "test/cctest/cctest.h"

using namespace ::v8::internal;


TEST(LockGuardMutex) {
  v8::base::Mutex mutex;
  { v8::base::LockGuard<v8::base::Mutex> lock_guard(&mutex);
  }
  { v8::base::LockGuard<v8::base::Mutex> lock_guard(&mutex);
  }
}


TEST(LockGuardRecursiveMutex) {
  v8::base::RecursiveMutex recursive_mutex;
  { v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard(&recursive_mutex);
  }
  { v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard1(&recursive_mutex);
    v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard2(&recursive_mutex);
  }
}


TEST(LockGuardLazyMutex) {
  v8::base::LazyMutex lazy_mutex = LAZY_MUTEX_INITIALIZER;
  { v8::base::LockGuard<v8::base::Mutex> lock_guard(lazy_mutex.Pointer());
  }
  { v8::base::LockGuard<v8::base::Mutex> lock_guard(lazy_mutex.Pointer());
  }
}


TEST(LockGuardLazyRecursiveMutex) {
  v8::base::LazyRecursiveMutex lazy_recursive_mutex =
      LAZY_RECURSIVE_MUTEX_INITIALIZER;
  {
    v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard(
        lazy_recursive_mutex.Pointer());
  }
  {
    v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard1(
        lazy_recursive_mutex.Pointer());
    v8::base::LockGuard<v8::base::RecursiveMutex> lock_guard2(
        lazy_recursive_mutex.Pointer());
  }
}


TEST(MultipleMutexes) {
  v8::base::Mutex mutex1;
  v8::base::Mutex mutex2;
  v8::base::Mutex mutex3;
  // Order 1
  mutex1.Lock();
  mutex2.Lock();
  mutex3.Lock();
  mutex1.Unlock();
  mutex2.Unlock();
  mutex3.Unlock();
  // Order 2
  mutex1.Lock();
  mutex2.Lock();
  mutex3.Lock();
  mutex3.Unlock();
  mutex2.Unlock();
  mutex1.Unlock();
}


TEST(MultipleRecursiveMutexes) {
  v8::base::RecursiveMutex recursive_mutex1;
  v8::base::RecursiveMutex recursive_mutex2;
  // Order 1
  recursive_mutex1.Lock();
  recursive_mutex2.Lock();
  CHECK(recursive_mutex1.TryLock());
  CHECK(recursive_mutex2.TryLock());
  recursive_mutex1.Unlock();
  recursive_mutex1.Unlock();
  recursive_mutex2.Unlock();
  recursive_mutex2.Unlock();
  // Order 2
  recursive_mutex1.Lock();
  CHECK(recursive_mutex1.TryLock());
  recursive_mutex2.Lock();
  CHECK(recursive_mutex2.TryLock());
  recursive_mutex2.Unlock();
  recursive_mutex1.Unlock();
  recursive_mutex2.Unlock();
  recursive_mutex1.Unlock();
}
